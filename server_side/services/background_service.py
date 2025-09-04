"""
Background service for automated cleanup and maintenance tasks
"""

import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from database.database import db_manager
from services.twilio_service import TwilioService

logger = logging.getLogger(__name__)

class BackgroundService:
    """Service for running background maintenance tasks"""
    
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.db = db_manager
        self.is_running = False
        
        # Initialize Twilio service for room monitoring
        try:
            self.twilio_service = TwilioService()
            logger.info("✅ Twilio service initialized for call monitoring")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Twilio service: {e}")
            self.twilio_service = None
    
    def start(self):
        """Start all background tasks"""
        if self.is_running:
            logger.warning("Background service already running")
            return
        
        try:
            # Clean up inactive users every 2 minutes
            self.scheduler.add_job(
                func=self.cleanup_inactive_users,
                trigger="interval",
                minutes=2,
                id='cleanup_inactive_users',
                name='Cleanup Inactive Users',
                replace_existing=True
            )
            
            # Clean up old calls every 5 minutes
            self.scheduler.add_job(
                func=self.cleanup_old_calls,
                trigger="interval",
                minutes=5,
                id='cleanup_old_calls',
                name='Cleanup Old Calls',
                replace_existing=True
            )
            
            # Sync calls with Twilio reality every 3 minutes (if Twilio available)
            if self.twilio_service:
                self.scheduler.add_job(
                    func=self.sync_calls_with_twilio,
                    trigger="interval",
                    minutes=3,
                    id='sync_calls_twilio',
                    name='Sync Calls with Twilio',
                    replace_existing=True
                )
            
            
            self.scheduler.start()
            self.is_running = True
            logger.info("🚀 Background service started successfully")
            logger.info("   📋 Active jobs:")
            for job in self.scheduler.get_jobs():
                logger.info(f"      - {job.name}: {job.trigger}")
            
        except Exception as e:
            logger.error(f"Failed to start background service: {e}")
            raise
    
    def stop(self):
        """Stop all background tasks"""
        if not self.is_running:
            return
        
        try:
            self.scheduler.shutdown(wait=False)
            self.is_running = False
            logger.info("🛑 Background service stopped")
        except Exception as e:
            logger.error(f"Error stopping background service: {e}")
    
    def cleanup_inactive_users(self):
        """Mark users as offline if they haven't been active in the last 3 minutes"""
        try:
            three_minutes_ago = datetime.now() - timedelta(minutes=3)
            
            # Get count of users who will be marked offline
            count_query = """
                SELECT COUNT(*) FROM user_presence 
                WHERE status = 'online' AND updated_at < ?
            """
            result = self.db.execute_query(count_query, (three_minutes_ago.isoformat(),), fetch='one')
            users_to_cleanup = result[0] if result else 0
            
            if users_to_cleanup > 0:
                # Update presence to offline for inactive users
                update_query = """
                    UPDATE user_presence 
                    SET status = 'offline', updated_at = CURRENT_TIMESTAMP
                    WHERE status = 'online' AND updated_at < ?
                """
                self.db.execute_query(update_query, (three_minutes_ago.isoformat(),))
                
                logger.info(f"🧹 Marked {users_to_cleanup} inactive users as offline")
            else:
                logger.debug("👥 All users are active - no cleanup needed")
                
        except Exception as e:
            logger.error(f"Failed to cleanup inactive users: {e}")
    
    def cleanup_old_calls(self):
        """Clean up old completed calls (older than 1 hour)"""
        try:
            one_hour_ago = datetime.now() - timedelta(hours=1)
            
            # Get count of calls to be cleaned
            count_query = """
                SELECT COUNT(*) FROM calls 
                WHERE status IN ('declined', 'cancelled', 'ended', 'missed') 
                AND created_at < ?
            """
            result = self.db.execute_query(count_query, (one_hour_ago.isoformat(),), fetch='one')
            calls_to_cleanup = result[0] if result else 0
            
            if calls_to_cleanup > 0:
                # Delete old completed calls
                delete_query = """
                    DELETE FROM calls 
                    WHERE status IN ('declined', 'cancelled', 'ended', 'missed') 
                    AND created_at < ?
                """
                self.db.execute_query(delete_query, (one_hour_ago.isoformat(),))
                
                logger.info(f"🗑️ Cleaned up {calls_to_cleanup} old call records")
            else:
                logger.debug("📞 No old calls to cleanup")
                
        except Exception as e:
            logger.error(f"Failed to cleanup old calls: {e}")
    
    def sync_calls_with_twilio(self):
        """Sync database call status with Twilio room reality (crash-resistant)"""
        if not self.twilio_service:
            logger.warning("Twilio service not available, skipping call sync")
            return
            
        try:
            # Get all accepted calls from database
            accepted_calls_query = """
                SELECT call_id, room_name, answered_at, created_at,
                       caller_id, callee_id
                FROM calls 
                WHERE status = 'accepted' AND room_name IS NOT NULL
            """
            accepted_calls = self.db.execute_query(accepted_calls_query, fetch='all')
            
            if not accepted_calls:
                logger.debug("📞 No accepted calls to sync with Twilio")
                return
            
            calls_synced = 0
            calls_ended = 0
            
            for call in accepted_calls:
                try:
                    room_name = call['room_name']
                    call_id = call['call_id']
                    
                    # Get Twilio room status
                    room_status = self.twilio_service.get_room_status(room_name)
                    
                    should_end_call = False
                    end_reason = ""
                    
                    if not room_status['exists']:
                        # Room doesn't exist in Twilio anymore
                        should_end_call = True
                        end_reason = "room_not_found"
                        
                    elif room_status['status'] == 'completed':
                        # Twilio marked room as completed
                        should_end_call = True
                        end_reason = "room_completed"
                        
                    elif room_status['status'] == 'failed':
                        # Twilio marked room as failed
                        should_end_call = True
                        end_reason = "room_failed"
                        
                    elif room_status['participant_count'] == 0:
                        # Room exists but is empty - check if it's been empty long enough
                        if self._is_call_abandoned(call, room_status):
                            should_end_call = True
                            end_reason = "room_abandoned"
                            
                    elif room_status['participant_count'] == 1:
                        # Only one person in room - check if other person has been gone too long
                        if self._is_call_single_participant_too_long(call, room_status):
                            should_end_call = True
                            end_reason = "single_participant_timeout"
                    
                    if should_end_call:
                        # End the call in database
                        success = self._end_call_with_twilio_sync(call_id, call['answered_at'], end_reason)
                        if success:
                            calls_ended += 1
                            logger.info(f"🔧 Ended call {call_id} - {end_reason}")
                    
                    calls_synced += 1
                    
                except Exception as e:
                    logger.error(f"Failed to sync call {call.get('call_id', 'unknown')}: {e}")
            
            if calls_ended > 0:
                logger.info(f"🔄 Synced {calls_synced} calls with Twilio, ended {calls_ended} calls")
            else:
                logger.debug(f"🔄 Synced {calls_synced} calls with Twilio, all active")
                
        except Exception as e:
            logger.error(f"Failed to sync calls with Twilio: {e}")
    
    def _is_call_abandoned(self, call: dict, room_status: dict) -> bool:
        """Check if a call should be considered abandoned (empty room too long)"""
        try:
            # If room is empty for more than 5 minutes, consider it abandoned
            answered_at = datetime.fromisoformat(call['answered_at'])
            time_since_answered = datetime.now() - answered_at
            
            # Conservative: don't end calls that just started
            if time_since_answered.total_seconds() < 300:  # 5 minutes
                return False
                
            # If room has been empty, it's likely abandoned
            return True
            
        except Exception as e:
            logger.error(f"Error checking if call abandoned: {e}")
            return False
    
    def _is_call_single_participant_too_long(self, call: dict, room_status: dict) -> bool:
        """Check if a call has had only one participant for too long"""
        try:
            # If only one person for more than 10 minutes, likely other person crashed
            answered_at = datetime.fromisoformat(call['answered_at'])
            time_since_answered = datetime.now() - answered_at
            
            # Conservative: only end if call has been going >10 minutes with 1 person
            return time_since_answered.total_seconds() > 600  # 10 minutes
            
        except Exception as e:
            logger.error(f"Error checking single participant timeout: {e}")
            return False
    
    def _end_call_with_twilio_sync(self, call_id: str, answered_at: str, reason: str = "twilio_sync") -> bool:
        """End a call with proper duration calculation"""
        try:
            # Calculate duration from answered_at to now
            answered_time = datetime.fromisoformat(answered_at)
            duration = int((datetime.now() - answered_time).total_seconds())
            
            # Update call status in database
            result = self.db.execute_query(
                """UPDATE calls 
                   SET status = 'ended', ended_at = CURRENT_TIMESTAMP, duration = ?
                   WHERE call_id = ? AND status = 'accepted'""",
                (duration, call_id)
            )
            
            if result:
                logger.info(f"📞 Call {call_id} ended via Twilio sync - {reason} (Duration: {duration}s)")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to end call {call_id} via Twilio sync: {e}")
            return False
    
    def get_status(self):
        """Get background service status"""
        return {
            'running': self.is_running,
            'jobs': [
                {
                    'id': job.id,
                    'name': job.name,
                    'next_run': job.next_run_time.isoformat() if job.next_run_time else None,
                    'trigger': str(job.trigger)
                }
                for job in self.scheduler.get_jobs()
            ] if self.is_running else []
        }

# Global instance
background_service = BackgroundService()