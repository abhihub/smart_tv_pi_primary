"""
Background service for automated cleanup and maintenance tasks
"""

import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from database.database import db_manager

logger = logging.getLogger(__name__)

class BackgroundService:
    """Service for running background maintenance tasks"""
    
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.db = db_manager
        self.is_running = False
    
    def start(self):
        """Start all background tasks"""
        if self.is_running:
            logger.warning("Background service already running")
            return
        
        try:
            # Clean up inactive users every 30 seconds
            self.scheduler.add_job(
                func=self.cleanup_inactive_users,
                trigger="interval",
                seconds=30,
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
        """Mark users as offline if they haven't been active in the last minute"""
        try:
            one_minute_ago = datetime.now() - timedelta(minutes=1)
            
            # Get count of users who will be marked offline
            count_query = """
                SELECT COUNT(*) FROM user_presence 
                WHERE status = 'online' AND updated_at < ?
            """
            result = self.db.execute_query(count_query, (one_minute_ago.isoformat(),), fetch='one')
            users_to_cleanup = result[0] if result else 0
            
            if users_to_cleanup > 0:
                # Update presence to offline for inactive users
                update_query = """
                    UPDATE user_presence 
                    SET status = 'offline', updated_at = CURRENT_TIMESTAMP
                    WHERE status = 'online' AND updated_at < ?
                """
                self.db.execute_query(update_query, (one_minute_ago.isoformat(),))
                
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