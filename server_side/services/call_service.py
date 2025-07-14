import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from database.database import db_manager
from flask import current_app

logger = logging.getLogger(__name__)

class CallService:
    """Service layer for managing user-to-user calls"""
    
    def __init__(self):
        self.db = db_manager
    
    def get_online_users(self, exclude_username: str = None) -> List[Dict[str, Any]]:
        """Get list of users who are currently online, with friend status if exclude_username provided"""
        try:
            # Extended time window to handle timezone issues - 30 minutes
            thirty_minutes_ago = datetime.now() - timedelta(minutes=30)
            
            exclude_clause = ""
            friend_join = ""
            friend_select = ", 0 as is_friend"
            params = (thirty_minutes_ago.isoformat(),)
            
            if exclude_username:
                exclude_clause = "AND u.username != ?"
                # Add friend relationship check
                friend_join = """
                    LEFT JOIN friends f ON (
                        (f.user_id = current_user.id AND f.friend_id = u.id) OR
                        (f.friend_id = current_user.id AND f.user_id = u.id)
                    ) AND f.status = 'accepted'
                    LEFT JOIN users current_user ON current_user.username = ?
                """
                friend_select = ", CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_friend"
                params = (thirty_minutes_ago.isoformat(), exclude_username, exclude_username)
            
            # Enhanced query with friend status
            query = f"""
                SELECT u.username, u.display_name, u.last_seen,
                       COALESCE(up.status, 'offline') as presence_status
                       {friend_select}
                FROM users u
                LEFT JOIN user_presence up ON u.id = up.user_id
                {friend_join}
                WHERE (
                    datetime(u.last_seen) > datetime(?) OR
                    u.last_seen > ? OR
                    julianday('now') - julianday(u.last_seen) < 0.021
                ) {exclude_clause}
                ORDER BY 
                    CASE WHEN {exclude_username and 'f.id IS NOT NULL' or '0'} THEN 0 ELSE 1 END,
                    u.last_seen DESC
            """
            
            # Use the same timestamp for both comparisons
            base_params = (thirty_minutes_ago.isoformat(), thirty_minutes_ago.isoformat())
            if exclude_username:
                params = base_params + (exclude_username, exclude_username)
            else:
                params = base_params
            
            results = self.db.execute_query(query, params, fetch='all')
            return [dict(row) for row in results] if results else []
            
        except Exception as e:
            logger.error(f"Failed to get online users: {e}")
            return []
    
    def create_call(self, creator_username: str, call_type: str = 'video', meeting_title: str = None, max_participants: int = 10) -> Optional[Dict[str, Any]]:
        """Create a new call room"""
        try:
            logger.info(f"=== CREATING CALL: {creator_username} ===" )
            
            # Get creator ID
            creator = self.db.execute_query(
                "SELECT id, username FROM users WHERE username = ?",
                (creator_username,),
                fetch='one'
            )
            
            if not creator:
                logger.warning(f"Invalid user for call creation: {creator_username}")
                return None
            
            # Generate unique call and room IDs
            call_id = str(uuid.uuid4())
            room_name = f"call_{call_id[:8]}"
            
            # Create call record
            self.db.execute_query(
                """INSERT INTO calls (call_id, room_name, creator_id, call_type, meeting_title, max_participants, status) 
                   VALUES (?, ?, ?, ?, ?, ?, 'active')""",
                (call_id, room_name, creator['id'], call_type, meeting_title, max_participants)
            )
            
            # Add creator as first participant
            self.db.execute_query(
                """INSERT INTO call_participants (call_id, user_id, status)
                   VALUES (?, ?, 'active')""",
                (call_id, creator['id'])
            )
            
            logger.info(f"Call created: {creator_username} (ID: {call_id}, Room: {room_name})")
            
            return {
                'call_id': call_id,
                'room_name': room_name,
                'creator': creator_username,
                'call_type': call_type,
                'meeting_title': meeting_title,
                'status': 'active',
                'created_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to create call: {e}")
            return None
    
    def join_call(self, call_id: str, username: str) -> Optional[Dict[str, Any]]:
        """Join an existing call"""
        try:
            # Get user ID
            user = self.db.execute_query(
                "SELECT id, username FROM users WHERE username = ?",
                (username,),
                fetch='one'
            )
            
            if not user:
                logger.warning(f"Invalid user for call join: {username}")
                return None
            
            # Get call details
            call = self.db.execute_query(
                """SELECT * FROM calls WHERE call_id = ? AND status = 'active'""",
                (call_id,),
                fetch='one'
            )
            
            if not call:
                logger.warning(f"Call not found or not active: {call_id}")
                return None
            
            # Check if user is already in call
            existing_participant = self.db.execute_query(
                """SELECT * FROM call_participants 
                   WHERE call_id = ? AND user_id = ? AND status = 'active'""",
                (call_id, user['id']),
                fetch='one'
            )
            
            if existing_participant:
                logger.info(f"User {username} already in call {call_id}")
                return {
                    'call_id': call_id,
                    'room_name': call['room_name'],
                    'status': 'joined'
                }
            
            # Check participant limit
            current_participants = self.db.execute_query(
                """SELECT COUNT(*) as count FROM call_participants 
                   WHERE call_id = ? AND status = 'active'""",
                (call_id,),
                fetch='one'
            )
            
            if current_participants['count'] >= call['max_participants']:
                logger.warning(f"Call {call_id} is full")
                return None
            
            # Add participant to call
            self.db.execute_query(
                """INSERT INTO call_participants (call_id, user_id, status)
                   VALUES (?, ?, 'active')""",
                (call_id, user['id'])
            )
            
            logger.info(f"User {username} joined call {call_id}")
            
            return {
                'call_id': call_id,
                'room_name': call['room_name'],
                'status': 'joined'
            }
            
        except Exception as e:
            logger.error(f"Failed to join call: {e}")
            return None
    
    def leave_call(self, call_id: str, username: str) -> bool:
        """Leave a call"""
        try:
            # Get user ID
            user = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (username,),
                fetch='one'
            )
            
            if not user:
                return False
            
            # Get participant record to calculate duration
            participant = self.db.execute_query(
                """SELECT joined_at FROM call_participants 
                   WHERE call_id = ? AND user_id = ? AND status = 'active'""",
                (call_id, user['id']),
                fetch='one'
            )
            
            if not participant:
                return False
            
            # Calculate duration
            joined_time = datetime.fromisoformat(participant['joined_at'])
            duration = int((datetime.now() - joined_time).total_seconds())
            
            # Update participant status
            self.db.execute_query(
                """UPDATE call_participants 
                   SET status = 'left', left_at = CURRENT_TIMESTAMP, duration = ?
                   WHERE call_id = ? AND user_id = ? AND status = 'active'""",
                (duration, call_id, user['id'])
            )
            
            logger.info(f"User {username} left call {call_id} (Duration: {duration}s)")
            return True
            
        except Exception as e:
            logger.error(f"Failed to leave call: {e}")
            return False
    
    def invite_to_call(self, call_id: str, inviter_username: str, invitee_username: str) -> Optional[Dict[str, Any]]:
        """Invite a user to join a call"""
        try:
            # Get user IDs
            inviter = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (inviter_username,),
                fetch='one'
            )
            invitee = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (invitee_username,),
                fetch='one'
            )
            
            if not inviter or not invitee:
                return None
            
            # Check if call exists and inviter is in it
            call_check = self.db.execute_query(
                """SELECT c.* FROM calls c
                   JOIN call_participants cp ON c.call_id = cp.call_id
                   WHERE c.call_id = ? AND cp.user_id = ? AND c.status = 'active' AND cp.status = 'active'""",
                (call_id, inviter['id']),
                fetch='one'
            )
            
            if not call_check:
                return None
            
            # Create invitation
            self.db.execute_query(
                """INSERT INTO call_invitations (call_id, inviter_id, invitee_id, status)
                   VALUES (?, ?, ?, 'pending')
                   ON CONFLICT(call_id, inviter_id, invitee_id) DO UPDATE SET
                   status = 'pending', invited_at = CURRENT_TIMESTAMP""",
                (call_id, inviter['id'], invitee['id'])
            )
            
            logger.info(f"Invitation sent: {inviter_username} invited {invitee_username} to call {call_id}")
            
            # Emit real-time notification to invitee
            try:
                if hasattr(current_app, 'socketio'):
                    current_app.socketio.emit('incoming_call', {
                        'call_id': call_id,
                        'caller_username': inviter_username,
                        'callee_username': invitee_username,
                        'room_name': call_check['room_name'],
                        'call_type': call_check['call_type'],
                        'meeting_title': call_check['meeting_title'],
                        'timestamp': datetime.now().isoformat()
                    }, room=f"user_{invitee_username}")
                    logger.info(f"Real-time call notification sent to {invitee_username}")
            except Exception as e:
                logger.error(f"Failed to send real-time notification: {e}")
            
            return {
                'call_id': call_id,
                'inviter': inviter_username,
                'invitee': invitee_username,
                'status': 'pending'
            }
            
        except Exception as e:
            logger.error(f"Failed to invite to call: {e}")
            return None
    
    def initiate_call(self, caller_username: str, callee_username: str) -> Optional[Dict[str, Any]]:
        """Initiate a direct call (legacy method for backward compatibility)"""
        # Create a call and invite the callee
        call_result = self.create_call(caller_username, 'video', f'Call with {callee_username}', 2)
        if call_result:
            # Invite the callee
            invite_result = self.invite_to_call(call_result['call_id'], caller_username, callee_username)
            if invite_result:
                return {
                    'call_id': call_result['call_id'],
                    'caller': caller_username,
                    'callee': callee_username,
                    'room_name': call_result['room_name'],
                    'status': 'pending',
                    'created_at': call_result['created_at']
                }
        return None
    
    def accept_call_invitation(self, call_id: str, username: str) -> Optional[Dict[str, Any]]:
        """Accept a call invitation"""
        try:
            # Get user ID
            user = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (username,),
                fetch='one'
            )
            
            if not user:
                return None
            
            # Update invitation status
            self.db.execute_query(
                """UPDATE call_invitations 
                   SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
                   WHERE call_id = ? AND invitee_id = ? AND status = 'pending'""",
                (call_id, user['id'])
            )
            
            # Join the call
            join_result = self.join_call(call_id, username)
            
            if join_result:
                logger.info(f"Call invitation accepted: {username} joined call {call_id}")
                
                # Notify all call participants about acceptance
                try:
                    if hasattr(current_app, 'socketio'):
                        current_app.socketio.emit('call_accepted', {
                            'call_id': call_id,
                            'accepter': username,
                            'status': 'accepted',
                            'room_name': join_result['room_name'],
                            'timestamp': datetime.now().isoformat()
                        })
                        logger.info(f"Call acceptance broadcast for call {call_id}")
                except Exception as e:
                    logger.error(f"Failed to broadcast call acceptance: {e}")
                
                return join_result
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to accept call invitation: {e}")
            return None
    
    def answer_call(self, call_id: str, callee_username: str) -> Optional[Dict[str, Any]]:
        """Answer an incoming call (legacy method for backward compatibility)"""
        return self.accept_call_invitation(call_id, callee_username)
    
    def decline_call_invitation(self, call_id: str, username: str) -> bool:
        """Decline a call invitation"""
        try:
            # Get user ID
            user = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (username,),
                fetch='one'
            )
            
            if not user:
                return False
            
            # Update invitation status
            result = self.db.execute_query(
                """UPDATE call_invitations 
                   SET status = 'declined', responded_at = CURRENT_TIMESTAMP
                   WHERE call_id = ? AND invitee_id = ? AND status = 'pending'""",
                (call_id, user['id'])
            )
            
            if result:
                logger.info(f"Call invitation declined: {call_id} by {username}")
                
                # Notify all call participants about decline
                try:
                    if hasattr(current_app, 'socketio'):
                        current_app.socketio.emit('call_declined', {
                            'call_id': call_id,
                            'decliner': username,
                            'status': 'declined',
                            'timestamp': datetime.now().isoformat()
                        })
                        logger.info(f"Call decline broadcast for call {call_id}")
                except Exception as e:
                    logger.error(f"Failed to broadcast call decline: {e}")
                
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to decline call invitation: {e}")
            return False
    
    def decline_call(self, call_id: str, callee_username: str) -> bool:
        """Decline an incoming call (legacy method)"""
        # First try to decline invitation
        if self.decline_call_invitation(call_id, callee_username):
            return True
        
        # Fallback: mark call as declined if it's a direct call
        try:
            result = self.db.execute_query(
                """UPDATE calls 
                   SET status = 'declined', ended_at = CURRENT_TIMESTAMP
                   WHERE call_id = ? AND status = 'active'""",
                (call_id,)
            )
            
            if result:
                # Calculate duration
                call = self.db.execute_query(
                    "SELECT created_at FROM calls WHERE call_id = ?",
                    (call_id,),
                    fetch='one'
                )
                
                if call:
                    created_time = datetime.fromisoformat(call['created_at'])
                    duration = int((datetime.now() - created_time).total_seconds())
                    
                    self.db.execute_query(
                        "UPDATE calls SET duration = ? WHERE call_id = ?",
                        (duration, call_id)
                    )
                
                logger.info(f"Call declined: {call_id} by {callee_username}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to decline call: {e}")
            return False
    
    def cancel_call(self, call_id: str, caller_username: str) -> bool:
        """Cancel an outgoing call"""
        try:
            result = self.db.execute_query(
                """UPDATE calls 
                   SET status = 'cancelled', ended_at = CURRENT_TIMESTAMP
                   WHERE call_id = ? AND caller_id = (
                       SELECT id FROM users WHERE username = ?
                   ) AND status IN ('pending', 'ringing')""",
                (call_id, caller_username)
            )
            
            if result:
                logger.info(f"Call cancelled: {call_id} by {caller_username}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to cancel call: {e}")
            return False
    
    def end_call(self, call_id: str, username: str) -> bool:
        """End an active call"""
        try:
            # Get call details to calculate duration
            call = self.db.execute_query(
                """SELECT created_at FROM calls 
                   WHERE call_id = ? AND status = 'active'""",
                (call_id,),
                fetch='one'
            )
            
            if not call:
                return False
            
            # Calculate total call duration
            created_time = datetime.fromisoformat(call['created_at'])
            duration = int((datetime.now() - created_time).total_seconds())
            
            # Update call status
            result = self.db.execute_query(
                """UPDATE calls 
                   SET status = 'ended', ended_at = CURRENT_TIMESTAMP, duration = ?
                   WHERE call_id = ? AND status = 'active'""",
                (duration, call_id)
            )
            
            # Mark all active participants as left
            self.db.execute_query(
                """UPDATE call_participants 
                   SET status = 'left', left_at = CURRENT_TIMESTAMP
                   WHERE call_id = ? AND status = 'active'""",
                (call_id,)
            )
            
            if result:
                logger.info(f"Call ended: {call_id} by {username} (Duration: {duration}s)")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to end call: {e}")
            return False
    
    def get_call_status(self, call_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a call"""
        try:
            call = self.db.execute_query(
                """SELECT c.*, 
                          creator.username as creator_username,
                          creator.display_name as creator_display_name
                   FROM calls c
                   JOIN users creator ON c.creator_id = creator.id
                   WHERE c.call_id = ?""",
                (call_id,),
                fetch='one'
            )
            
            if not call:
                return None
            
            # Get participants
            participants = self.db.execute_query(
                """SELECT cp.*, u.username, u.display_name
                   FROM call_participants cp
                   JOIN users u ON cp.user_id = u.id
                   WHERE cp.call_id = ?
                   ORDER BY cp.joined_at""",
                (call_id,),
                fetch='all'
            )
            
            call_dict = dict(call)
            call_dict['participants'] = [dict(p) for p in participants] if participants else []
            
            return call_dict
            
        except Exception as e:
            logger.error(f"Failed to get call status: {e}")
            return None
    
    def get_pending_invitations_for_user(self, username: str) -> List[Dict[str, Any]]:
        """Get pending call invitations for a user"""
        try:
            user = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (username,),
                fetch='one'
            )
            
            if not user:
                return []
            
            invitations = self.db.execute_query(
                """SELECT ci.call_id, ci.status, ci.invited_at,
                          c.meeting_title, c.call_type, c.room_name,
                          inviter.username as inviter_username,
                          inviter.display_name as inviter_display_name,
                          creator.username as creator_username
                   FROM call_invitations ci
                   JOIN calls c ON ci.call_id = c.call_id
                   JOIN users inviter ON ci.inviter_id = inviter.id
                   JOIN users creator ON c.creator_id = creator.id
                   WHERE ci.invitee_id = ? AND ci.status = 'pending' AND c.status = 'active'
                   ORDER BY ci.invited_at DESC""",
                (user['id'],),
                fetch='all'
            )
            
            return [dict(inv) for inv in invitations] if invitations else []
            
        except Exception as e:
            logger.error(f"Failed to get pending invitations: {e}")
            return []
    
    def get_pending_calls_for_user(self, username: str) -> List[Dict[str, Any]]:
        """Get pending calls for a user (legacy method)"""
        return self.get_pending_invitations_for_user(username)
    
    def get_active_calls_for_user(self, username: str) -> List[Dict[str, Any]]:
        """Get active calls that a user is participating in"""
        try:
            user = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (username,),
                fetch='one'
            )
            
            if not user:
                return []
            
            calls = self.db.execute_query(
                """SELECT c.*, creator.username as creator_username
                   FROM calls c
                   JOIN users creator ON c.creator_id = creator.id
                   JOIN call_participants cp ON c.call_id = cp.call_id
                   WHERE cp.user_id = ? AND cp.status = 'active' AND c.status = 'active'
                   ORDER BY c.created_at DESC""",
                (user['id'],),
                fetch='all'
            )
            
            return [dict(call) for call in calls] if calls else []
            
        except Exception as e:
            logger.error(f"Failed to get active calls: {e}")
            return []
    
    def update_presence(self, username: str, status: str = 'online', socket_id: str = None) -> bool:
        """Update user presence status"""
        try:
            user = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (username,),
                fetch='one'
            )
            
            if not user:
                return False
            
            # Insert or update presence
            self.db.execute_query(
                """INSERT INTO user_presence (user_id, status, socket_id, updated_at)
                   VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                   ON CONFLICT(user_id) DO UPDATE SET
                   status = excluded.status,
                   socket_id = excluded.socket_id,
                   updated_at = excluded.updated_at""",
                (user['id'], status, socket_id)
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to update presence for {username}: {e}")
            return False
    
    def cleanup_old_calls(self, hours: int = 24) -> int:
        """Clean up old completed calls"""
        try:
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            # Clean up old calls
            result = self.db.execute_query(
                """DELETE FROM calls 
                   WHERE status IN ('declined', 'cancelled', 'ended') 
                   AND created_at < ?""",
                (cutoff_time.isoformat(),)
            )
            
            # Clean up old call invitations
            self.db.execute_query(
                """DELETE FROM call_invitations 
                   WHERE status IN ('declined', 'cancelled') 
                   AND invited_at < ?""",
                (cutoff_time.isoformat(),)
            )
            
            logger.info(f"Cleaned up old calls: {result} records removed")
            return result or 0
            
        except Exception as e:
            logger.error(f"Failed to cleanup old calls: {e}")
            return 0
    
    def get_call_history(self, username: str = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Get call history"""
        try:
            if username:
                # Get calls for specific user
                user = self.db.execute_query(
                    "SELECT id FROM users WHERE username = ?",
                    (username,),
                    fetch='one'
                )
                
                if not user:
                    return []
                
                calls = self.db.execute_query(
                    """SELECT * FROM call_history ch
                       WHERE ch.creator_id = ? OR EXISTS (
                           SELECT 1 FROM call_participants cp 
                           WHERE cp.call_id = ch.call_id AND cp.user_id = ?
                       )
                       ORDER BY ch.created_at DESC
                       LIMIT ?""",
                    (user['id'], user['id'], limit),
                    fetch='all'
                )
            else:
                # Get all calls
                calls = self.db.execute_query(
                    """SELECT * FROM call_history 
                       ORDER BY created_at DESC 
                       LIMIT ?""",
                    (limit,),
                    fetch='all'
                )
            
            return [dict(call) for call in calls] if calls else []
            
        except Exception as e:
            logger.error(f"Failed to get call history: {e}")
            return []