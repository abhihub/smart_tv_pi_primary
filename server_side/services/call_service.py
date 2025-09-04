import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from database.database import db_manager

logger = logging.getLogger(__name__)

class CallService:
    """Service layer for managing user-to-user calls"""
    
    def __init__(self):
        self.db = db_manager
    
    def get_online_users(self, exclude_username: str = None, contacts_only: bool = False, include_offline: bool = False) -> List[Dict[str, Any]]:
        """Get list of users who are currently online, optionally filtered by contact list. If include_offline=True, shows all users with status"""
        try:
            logger.info(f"=== GET_ONLINE_USERS CALLED === exclude: {exclude_username}, contacts_only: {contacts_only}, include_offline: {include_offline}")
            exclude_clause = ""
            contact_filter = ""
            params = []
            
            if contacts_only and exclude_username:
                # Only show users who are in the requesting user's contact list
                contact_filter = """
                    AND EXISTS (
                        SELECT 1 FROM user_contacts uc 
                        JOIN users requester ON requester.username = ?
                        WHERE uc.user_id = requester.id AND uc.contact_user_id = u.id
                    )
                """
                params.append(exclude_username)
            
            if exclude_username:
                exclude_clause = "AND u.username != ?"
                params.append(exclude_username)
            
            # Use presence table status as primary source of truth
            query = f"""
                SELECT u.username, u.display_name, u.last_seen,
                       COALESCE(up.status, 'offline') as presence_status,
                       COALESCE(up.updated_at, u.last_seen) as updated_at,
                       CASE WHEN uc_fav.is_favorite = 1 THEN 1 ELSE 0 END as is_favorite
                FROM users u
                LEFT JOIN user_presence up ON u.id = up.user_id
                LEFT JOIN user_contacts uc_fav ON (
                    uc_fav.contact_user_id = u.id AND 
                    uc_fav.user_id = (SELECT id FROM users WHERE username = ?)
                )
                WHERE 1=1 {exclude_clause} {contact_filter}
                ORDER BY 
                    CASE WHEN uc_fav.is_favorite = 1 THEN 1 ELSE 0 END DESC,  -- Favorites first
                    CASE WHEN COALESCE(up.status, 'offline') = 'online' THEN 1 ELSE 0 END DESC,  -- Online users first (removed 10-second check)
                    u.username ASC  -- Sort by username (ID)
            """
            
            # Add the username parameter for the favorite check
            final_params = []
            if exclude_username:
                final_params.append(exclude_username)  # For favorite check
            final_params.extend(params)  # Add other parameters
            
            results = self.db.execute_query(query, tuple(final_params), fetch='all')
            logger.info(f"Query returned {len(results) if results else 0} rows")
            
            all_users = []
            for row in results or []:
                try:
                    # Convert row to dict for safe access
                    row_dict = dict(row)
                    
                    # Determine if user is actually online based on presence status and recency
                    is_online = self._is_user_actually_online(row_dict['presence_status'], row_dict.get('updated_at'))
                    
                    logger.info(f"User {row_dict['username']}: presence_status={row_dict['presence_status']}, is_online={is_online}, updated_at={row_dict.get('updated_at', 'N/A')}")
                    
                    all_users.append({
                        'username': row_dict['username'],
                        'display_name': row_dict['display_name'],
                        'last_seen': row_dict['last_seen'],
                        'presence_status': row_dict['presence_status'],
                        'is_online': is_online,
                        'is_favorite': bool(row_dict['is_favorite']) if row_dict['is_favorite'] is not None else False
                    })
                except Exception as row_error:
                    logger.error(f"Error processing row: {row_error}")
                    continue
            
            logger.info(f"Returning {len(all_users)} users: {[u['username'] + '(' + ('ON' if u['is_online'] else 'OFF') + ')' for u in all_users]}")
            return all_users
            
        except Exception as e:
            logger.error(f"Failed to get online users: {e}")
            logger.error(f"Exception type: {type(e)}")
            logger.error(f"Exception args: {e.args}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return []
    
    def initiate_call(self, caller_username: str, callee_username: str) -> Optional[Dict[str, Any]]:
        """Initiate a call from caller to callee"""
        try:
            logger.info(f"=== INITIATING CALL: {caller_username} -> {callee_username} ===")
            
            # Get user IDs
            caller = self.db.execute_query(
                "SELECT id, username FROM users WHERE username = ?",
                (caller_username,),
                fetch='one'
            )
            callee = self.db.execute_query(
                "SELECT id, username FROM users WHERE username = ?",
                (callee_username,),
                fetch='one'
            )
            
            logger.info(f"Caller lookup: {caller}")
            logger.info(f"Callee lookup: {callee}")
            
            if not caller or not callee:
                logger.warning(f"Invalid users for call: {caller_username} -> {callee_username}")
                logger.warning(f"Caller found: {caller is not None}, Callee found: {callee is not None}")
                return None
            
            # Check ALL calls in database for debugging
            all_calls = self.db.execute_query(
                "SELECT call_id, caller_id, callee_id, status FROM calls",
                (),
                fetch='all'
            )
            logger.info(f"All calls in database: {[dict(call) for call in all_calls] if all_calls else 'None'}")
            
            # Check for existing calls between these users and auto-cleanup
            existing_call_query = """SELECT call_id, status FROM calls 
                   WHERE ((caller_id = ? AND callee_id = ?) OR (caller_id = ? AND callee_id = ?))
                   AND status IN ('pending', 'ringing', 'accepted')"""
            existing_call = self.db.execute_query(
                existing_call_query,
                (caller['id'], callee['id'], callee['id'], caller['id']),
                fetch='one'
            )
            
            logger.info(f"Existing call query: {existing_call_query}")
            logger.info(f"Query params: caller_id={caller['id']}, callee_id={callee['id']}")
            logger.info(f"Existing call result: {dict(existing_call) if existing_call else 'None'}")
            
            if existing_call:
                logger.info(f"Auto-clearing existing call between {caller_username} and {callee_username}: {dict(existing_call)}")
                
                # Automatically clear the existing call to allow the new one
                self.db.execute_query(
                    """UPDATE calls 
                       SET status = 'cancelled', ended_at = CURRENT_TIMESTAMP
                       WHERE call_id = ?""",
                    (existing_call['call_id'],)
                )
                
                logger.info(f"Previous call {existing_call['call_id']} auto-cancelled to allow new call")
            
            # Generate unique call ID
            call_id = str(uuid.uuid4())
            
            # Create call record
            self.db.execute_query(
                """INSERT INTO calls (caller_id, callee_id, call_id, status) 
                   VALUES (?, ?, ?, 'pending')""",
                (caller['id'], callee['id'], call_id)
            )
            
            logger.info(f"Call initiated: {caller_username} -> {callee_username} (ID: {call_id})")
            
            return {
                'call_id': call_id,
                'caller': caller_username,
                'callee': callee_username,
                'status': 'pending',
                'created_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to initiate call: {e}")
            return None
    
    def answer_call(self, call_id: str, callee_username: str) -> Optional[Dict[str, Any]]:
        """Answer an incoming call"""
        try:
            # Get call details
            call = self.db.execute_query(
                """SELECT c.*, 
                          u1.username as caller_username,
                          u2.username as callee_username
                   FROM calls c
                   JOIN users u1 ON c.caller_id = u1.id
                   JOIN users u2 ON c.callee_id = u2.id
                   WHERE c.call_id = ? AND u2.username = ? AND c.status IN ('pending', 'ringing')""",
                (call_id, callee_username),
                fetch='one'
            )
            
            if not call:
                logger.warning(f"Invalid call answer attempt: {call_id} by {callee_username}")
                return None
            
            # Generate unique room name for this call
            room_name = f"call_{call_id[:8]}"
            
            # Update call status
            self.db.execute_query(
                """UPDATE calls 
                   SET status = 'accepted', answered_at = CURRENT_TIMESTAMP, room_name = ?
                   WHERE call_id = ?""",
                (room_name, call_id)
            )
            
            logger.info(f"Call answered: {call['caller_username']} -> {callee_username} (Room: {room_name})")
            
            return {
                'call_id': call_id,
                'caller': call['caller_username'],
                'callee': callee_username,
                'room_name': room_name,
                'status': 'accepted'
            }
            
        except Exception as e:
            logger.error(f"Failed to answer call: {e}")
            return None
    
    def decline_call(self, call_id: str, callee_username: str) -> bool:
        """Decline an incoming call"""
        try:
            # Update call status
            result = self.db.execute_query(
                """UPDATE calls 
                   SET status = 'declined', ended_at = CURRENT_TIMESTAMP
                   WHERE call_id = ? AND callee_id = (
                       SELECT id FROM users WHERE username = ?
                   ) AND status IN ('pending', 'ringing')""",
                (call_id, callee_username)
            )
            
            if result:
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
            # Calculate duration
            call = self.db.execute_query(
                """SELECT answered_at FROM calls 
                   WHERE call_id = ? AND status = 'accepted'""",
                (call_id,),
                fetch='one'
            )
            
            duration = 0
            if call and call['answered_at']:
                answered_time = datetime.fromisoformat(call['answered_at'])
                duration = int((datetime.now() - answered_time).total_seconds())
            
            # Update call status
            result = self.db.execute_query(
                """UPDATE calls 
                   SET status = 'ended', ended_at = CURRENT_TIMESTAMP, duration = ?
                   WHERE call_id = ? AND status = 'accepted'""",
                (duration, call_id)
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
                          u1.username as caller_username,
                          u2.username as callee_username
                   FROM calls c
                   JOIN users u1 ON c.caller_id = u1.id
                   JOIN users u2 ON c.callee_id = u2.id
                   WHERE c.call_id = ?""",
                (call_id,),
                fetch='one'
            )
            
            return dict(call) if call else None
            
        except Exception as e:
            logger.error(f"Failed to get call status: {e}")
            return None
    
    def get_pending_calls_for_user(self, username: str) -> List[Dict[str, Any]]:
        """Get pending/ringing calls for a user"""
        try:
            calls = self.db.execute_query(
                """SELECT c.call_id, c.status, c.created_at,
                          u1.username as caller_username,
                          u1.display_name as caller_display_name
                   FROM calls c
                   JOIN users u1 ON c.caller_id = u1.id
                   JOIN users u2 ON c.callee_id = u2.id
                   WHERE u2.username = ? AND c.status IN ('pending', 'ringing')
                   ORDER BY c.created_at DESC""",
                (username,),
                fetch='all'
            )
            
            return [dict(call) for call in calls] if calls else []
            
        except Exception as e:
            logger.error(f"Failed to get pending calls: {e}")
            return []
    
    def update_presence(self, username: str, status: str = 'online', socket_id: str = None) -> bool:
        """Update user presence status"""
        try:
            logger.info(f"=== UPDATE_PRESENCE === User: {username}, Status: {status}, Socket: {socket_id}")
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
            
            result = self.db.execute_query(
                """DELETE FROM calls 
                   WHERE status IN ('declined', 'cancelled', 'ended', 'missed') 
                   AND created_at < ?""",
                (cutoff_time.isoformat(),)
            )
            
            logger.info(f"Cleaned up old calls: {result} records removed")
            return result or 0
            
        except Exception as e:
            logger.error(f"Failed to cleanup old calls: {e}")
            return 0
    
    def _is_user_actually_online(self, presence_status: str, updated_at: str) -> bool:
        """Determine if a user is actually online based on presence status and timestamp freshness"""
        try:
            # If status is not online, definitely offline
            if presence_status != 'online':
                return False
            
            # If no timestamp available, assume offline
            if not updated_at:
                return False
                
            # Parse the timestamp
            try:
                if updated_at.endswith('Z'):
                    # Handle UTC timezone
                    updated_time = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
                else:
                    updated_time = datetime.fromisoformat(updated_at)
            except ValueError:
                # If timestamp parsing fails, assume offline
                logger.warning(f"Could not parse timestamp: {updated_at}")
                return False
            
            # User is online if they updated presence within the last 2 minutes
            # This gives some buffer over the background service's 1-minute threshold
            time_diff = (datetime.now() - updated_time).total_seconds()
            is_recent = time_diff <= 120  # 2 minutes
            
            logger.debug(f"Presence check: status={presence_status}, age={time_diff}s, is_recent={is_recent}")
            return is_recent
            
        except Exception as e:
            logger.error(f"Error determining online status: {e}")
            # Default to offline if we can't determine status safely
            return False