import json
import logging
from datetime import datetime
from typing import Optional, Dict, List, Any
from database.database import db_manager

logger = logging.getLogger(__name__)

class UserService:
    """Service layer for user management operations"""
    
    def __init__(self):
        self.db = db_manager
    
    def register_or_update_user(self, userid: str, username: str, display_name: str = None, 
                               device_type: str = 'smarttv', metadata: Dict = None) -> Dict[str, Any]:
        """Register a new user or update existing user's last seen"""
        try:
            # Check if user already exists
            existing_user = self.get_user_by_username(username)
            
            if existing_user:
                # Update last seen and optionally display name
                self.update_last_seen(username)
                if display_name and display_name != existing_user['display_name']:
                    self.update_user_info(username, display_name=display_name)
                
                user_data = self.get_user_by_username(username)
                logger.info(f"User {username} updated")
                return {
                    'userid': user_data['userid'],
                    'username': user_data['username'],
                    'display_name': user_data['display_name'],
                    'is_new_user': False,
                    'last_seen': user_data['last_seen']
                }
            else:
                # Create new user
                metadata_json = json.dumps(metadata or {})
                
                self.db.execute_query(
                    """INSERT INTO users (userid, username, display_name, device_type, metadata) 
                       VALUES (?, ?, ?, ?, ?)""",
                    (userid, username, display_name or username, device_type, metadata_json)
                )
                
                logger.info(f"New user {username} registered with ID {userid}")
                return {
                    'userid': userid,
                    'username': username,
                    'display_name': display_name or username,
                    'is_new_user': True,
                    'created_at': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Failed to register/update user {username}: {e}")
            raise
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        try:
            result = self.db.execute_query(
                "SELECT * FROM users WHERE username = ?",
                (username,),
                fetch='one'
            )
            return dict(result) if result else None
        except Exception as e:
            logger.error(f"Failed to get user {username}: {e}")
            return None
    
    def get_user_by_id(self, userid: str) -> Optional[Dict[str, Any]]:
        """Get user by userid"""
        try:
            result = self.db.execute_query(
                "SELECT * FROM users WHERE userid = ?",
                (userid,),
                fetch='one'
            )
            return dict(result) if result else None
        except Exception as e:
            logger.error(f"Failed to get user by ID {userid}: {e}")
            return None
    
    def update_last_seen(self, username: str) -> bool:
        """Update user's last seen timestamp"""
        try:
            self.db.execute_query(
                "UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE username = ?",
                (username,)
            )
            return True
        except Exception as e:
            logger.error(f"Failed to update last seen for {username}: {e}")
            return False
    
    def update_user_info(self, username: str, display_name: str = None, 
                        metadata: Dict = None) -> bool:
        """Update user information"""
        try:
            updates = []
            params = []
            
            if display_name:
                updates.append("display_name = ?")
                params.append(display_name)
            
            if metadata:
                updates.append("metadata = ?")
                params.append(json.dumps(metadata))
            
            if not updates:
                return True
            
            query = f"UPDATE users SET {', '.join(updates)} WHERE username = ?"
            params.append(username)
            
            self.db.execute_query(query, tuple(params))
            logger.info(f"Updated user info for {username}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update user info for {username}: {e}")
            return False
    
    def get_active_users(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recently active users"""
        try:
            results = self.db.execute_query(
                """SELECT username, display_name, last_seen, device_type 
                   FROM users 
                   WHERE is_active = 1 
                   ORDER BY last_seen DESC 
                   LIMIT ?""",
                (limit,),
                fetch='all'
            )
            return [dict(row) for row in results] if results else []
        except Exception as e:
            logger.error(f"Failed to get active users: {e}")
            return []
    
    def create_session(self, username: str, session_type: str = 'video_call', 
                      room_name: str = None) -> Optional[str]:
        """Create a new user session"""
        try:
            user = self.get_user_by_username(username)
            if not user:
                logger.warning(f"User {username} not found, attempting auto-registration...")
                # Try auto-registration to fix race condition
                import secrets
                import string
                userid = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(17))
                registration_result = self.register_or_update_user(userid, username)
                if registration_result and registration_result.get('userid'):
                    logger.info(f"Auto-registered user {username} during session creation with ID {registration_result['userid']}")
                    user = self.get_user_by_username(username)
                else:
                    logger.error(f"Failed to auto-register user {username}")
                    return None
                
            if not user:
                logger.error(f"Cannot create session for user: {username}")
                return None
            
            # Generate session token (simple timestamp-based for now)
            session_token = f"{username}_{int(datetime.now().timestamp())}"
            
            # End any existing active sessions for this user
            self.db.execute_query(
                """UPDATE user_sessions 
                   SET is_active = 0, ended_at = CURRENT_TIMESTAMP 
                   WHERE userid = ? AND is_active = 1""",
                (user['userid'],)
            )
            
            # Create new session
            self.db.execute_query(
                """INSERT INTO user_sessions (userid, session_token, session_type, room_name) 
                   VALUES (?, ?, ?, ?)""",
                (user['userid'], session_token, session_type, room_name)
            )
            
            logger.info(f"Created {session_type} session for {username}")
            return session_token
            
        except Exception as e:
            logger.error(f"Failed to create session for {username}: {e}")
            return None
    
    def end_session(self, session_token: str) -> bool:
        """End a user session"""
        try:
            self.db.execute_query(
                """UPDATE user_sessions 
                   SET is_active = 0, ended_at = CURRENT_TIMESTAMP 
                   WHERE session_token = ?""",
                (session_token,)
            )
            logger.info(f"Ended session {session_token}")
            return True
        except Exception as e:
            logger.error(f"Failed to end session {session_token}: {e}")
            return False
    
    def get_user_stats(self, username: str) -> Dict[str, Any]:
        """Get user statistics"""
        try:
            user = self.get_user_by_username(username)
            if not user:
                return {}
            
            # Get game stats
            game_stats = self.db.execute_query(
                """SELECT 
                     COUNT(*) as games_played,
                     AVG(score) as avg_score,
                     MAX(score) as best_score,
                     SUM(correct_answers) as total_correct,
                     SUM(questions_answered) as total_questions
                   FROM game_scores 
                   WHERE userid = ?""",
                (user['userid'],),
                fetch='one'
            )
            
            # Get session stats
            session_stats = self.db.execute_query(
                """SELECT 
                     COUNT(*) as total_sessions,
                     COUNT(CASE WHEN session_type = 'video_call' THEN 1 END) as video_sessions,
                     COUNT(CASE WHEN session_type = 'trivia_game' THEN 1 END) as trivia_sessions
                   FROM user_sessions 
                   WHERE userid = ?""",
                (user['userid'],),
                fetch='one'
            )
            
            return {
                'username': user['username'],
                'display_name': user['display_name'],
                'member_since': user['created_at'],
                'last_seen': user['last_seen'],
                'games_played': game_stats['games_played'] or 0,
                'avg_score': round(game_stats['avg_score'] or 0, 1),
                'best_score': game_stats['best_score'] or 0,
                'total_correct_answers': game_stats['total_correct'] or 0,
                'total_questions_answered': game_stats['total_questions'] or 0,
                'total_sessions': session_stats['total_sessions'] or 0,
                'video_sessions': session_stats['video_sessions'] or 0,
                'trivia_sessions': session_stats['trivia_sessions'] or 0
            }
            
        except Exception as e:
            logger.error(f"Failed to get stats for {username}: {e}")
            return {}
    
    def save_game_score(self, username: str, game_type: str, score: int,
                       questions_answered: int, correct_answers: int,
                       game_duration: int = 0, room_name: str = None) -> bool:
        """Save game score for user"""
        try:
            user = self.get_user_by_username(username)
            if not user:
                logger.warning(f"Cannot save score for non-existent user: {username}")
                return False
            
            self.db.execute_query(
                """INSERT INTO game_scores 
                   (userid, game_type, score, questions_answered, correct_answers, 
                    game_duration, room_name) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (user['userid'], game_type, score, questions_answered, correct_answers,
                 game_duration, room_name)
            )
            
            logger.info(f"Saved {game_type} score {score} for {username}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save game score for {username}: {e}")
            return False
    
    def send_friend_request(self, sender_username: str, receiver_username: str, message: str = None) -> bool:
        """Send a friend request"""
        try:
            # Get user IDs
            sender = self.get_user_by_username(sender_username)
            receiver = self.get_user_by_username(receiver_username)
            
            if not sender or not receiver:
                logger.warning(f"Invalid users for friend request: {sender_username} -> {receiver_username}")
                return False
            
            if sender['userid'] == receiver['userid']:
                logger.warning(f"User cannot send friend request to themselves: {sender_username}")
                return False
            
            # Check if already friends
            existing_friendship = self.db.execute_query(
                """SELECT id FROM friends 
                   WHERE (userid = ? AND friend_userid = ?) OR (userid = ? AND friend_userid = ?)
                   AND status = 'accepted'""",
                (sender['userid'], receiver['userid'], receiver['userid'], sender['userid']),
                fetch='one'
            )
            
            if existing_friendship:
                logger.info(f"Users {sender_username} and {receiver_username} are already friends")
                return False
            
            # Insert or update friend request
            self.db.execute_query(
                """INSERT INTO friend_requests (sender_userid, receiver_userid, message, status)
                   VALUES (?, ?, ?, 'pending')
                   ON CONFLICT(sender_userid, receiver_userid) DO UPDATE SET
                   message = excluded.message,
                   status = 'pending',
                   created_at = CURRENT_TIMESTAMP,
                   responded_at = NULL""",
                (sender['userid'], receiver['userid'], message)
            )
            
            logger.info(f"Friend request sent: {sender_username} -> {receiver_username}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send friend request: {e}")
            return False
    
    def accept_friend_request(self, sender_username: str, receiver_username: str) -> bool:
        """Accept a friend request"""
        try:
            # Get user IDs
            sender = self.get_user_by_username(sender_username)
            receiver = self.get_user_by_username(receiver_username)
            
            if not sender or not receiver:
                return False
            
            # Update friend request status
            self.db.execute_query(
                """UPDATE friend_requests 
                   SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
                   WHERE sender_userid = ? AND receiver_userid = ? AND status = 'pending'""",
                (sender['userid'], receiver['userid'])
            )
            
            # Create friendship entries (bidirectional)
            self.db.execute_query(
                """INSERT INTO friends (userid, friend_userid, status)
                   VALUES (?, ?, 'accepted'), (?, ?, 'accepted')
                   ON CONFLICT(userid, friend_userid) DO UPDATE SET
                   status = 'accepted', updated_at = CURRENT_TIMESTAMP""",
                (sender['userid'], receiver['userid'], receiver['userid'], sender['userid'])
            )
            
            logger.info(f"Friend request accepted: {sender_username} <-> {receiver_username}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to accept friend request: {e}")
            return False
    
    def decline_friend_request(self, sender_username: str, receiver_username: str) -> bool:
        """Decline a friend request"""
        try:
            # Get user IDs
            sender = self.get_user_by_username(sender_username)
            receiver = self.get_user_by_username(receiver_username)
            
            if not sender or not receiver:
                return False
            
            # Update friend request status
            result = self.db.execute_query(
                """UPDATE friend_requests 
                   SET status = 'declined', responded_at = CURRENT_TIMESTAMP
                   WHERE sender_userid = ? AND receiver_userid = ? AND status = 'pending'""",
                (sender['userid'], receiver['userid'])
            )
            
            if result:
                logger.info(f"Friend request declined: {sender_username} -> {receiver_username}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to decline friend request: {e}")
            return False
    
    def remove_friend(self, username1: str, username2: str) -> bool:
        """Remove friendship between two users"""
        try:
            # Get user IDs
            user1 = self.get_user_by_username(username1)
            user2 = self.get_user_by_username(username2)
            
            if not user1 or not user2:
                return False
            
            # Remove friendship entries (bidirectional)
            self.db.execute_query(
                """DELETE FROM friends 
                   WHERE (userid = ? AND friend_userid = ?) OR (userid = ? AND friend_userid = ?)""",
                (user1['userid'], user2['userid'], user2['userid'], user1['userid'])
            )
            
            logger.info(f"Friendship removed: {username1} <-> {username2}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to remove friendship: {e}")
            return False
    
    def block_user(self, username: str, blocked_username: str) -> bool:
        """Block a user"""
        try:
            # Get user IDs
            user = self.get_user_by_username(username)
            blocked_user = self.get_user_by_username(blocked_username)
            
            if not user or not blocked_user:
                return False
            
            # Remove existing friendship if any
            self.remove_friend(username, blocked_username)
            
            # Create block entry
            self.db.execute_query(
                """INSERT INTO friends (userid, friend_userid, status)
                   VALUES (?, ?, 'blocked')
                   ON CONFLICT(userid, friend_userid) DO UPDATE SET
                   status = 'blocked', updated_at = CURRENT_TIMESTAMP""",
                (user['userid'], blocked_user['userid'])
            )
            
            logger.info(f"User blocked: {username} blocked {blocked_username}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to block user: {e}")
            return False
    
    def unblock_user(self, username: str, blocked_username: str) -> bool:
        """Unblock a user"""
        try:
            # Get user IDs
            user = self.get_user_by_username(username)
            blocked_user = self.get_user_by_username(blocked_username)
            
            if not user or not blocked_user:
                return False
            
            # Remove block entry
            result = self.db.execute_query(
                """DELETE FROM friends 
                   WHERE userid = ? AND friend_userid = ? AND status = 'blocked'""",
                (user['userid'], blocked_user['userid'])
            )
            
            if result:
                logger.info(f"User unblocked: {username} unblocked {blocked_username}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to unblock user: {e}")
            return False
    
    def get_friends_list(self, username: str) -> List[Dict[str, Any]]:
        """Get user's friends list"""
        try:
            user = self.get_user_by_username(username)
            if not user:
                return []
            
            friends = self.db.execute_query(
                """SELECT * FROM user_friends WHERE userid = ?
                   ORDER BY friend_status DESC, friend_last_seen DESC""",
                (user['userid'],),
                fetch='all'
            )
            
            return [dict(friend) for friend in friends] if friends else []
            
        except Exception as e:
            logger.error(f"Failed to get friends list for {username}: {e}")
            return []
    
    def get_pending_friend_requests(self, username: str) -> List[Dict[str, Any]]:
        """Get pending friend requests for a user"""
        try:
            user = self.get_user_by_username(username)
            if not user:
                return []
            
            requests = self.db.execute_query(
                """SELECT fr.*, u.username as sender_username, u.display_name as sender_display_name
                   FROM friend_requests fr
                   JOIN users u ON fr.sender_userid = u.userid
                   WHERE fr.receiver_userid = ? AND fr.status = 'pending'
                   ORDER BY fr.created_at DESC""",
                (user['userid'],),
                fetch='all'
            )
            
            return [dict(req) for req in requests] if requests else []
            
        except Exception as e:
            logger.error(f"Failed to get pending friend requests for {username}: {e}")
            return []
    
    def get_sent_friend_requests(self, username: str) -> List[Dict[str, Any]]:
        """Get sent friend requests for a user"""
        try:
            user = self.get_user_by_username(username)
            if not user:
                return []
            
            requests = self.db.execute_query(
                """SELECT fr.*, u.username as receiver_username, u.display_name as receiver_display_name
                   FROM friend_requests fr
                   JOIN users u ON fr.receiver_userid = u.userid
                   WHERE fr.sender_userid = ? AND fr.status = 'pending'
                   ORDER BY fr.created_at DESC""",
                (user['userid'],),
                fetch='all'
            )
            
            return [dict(req) for req in requests] if requests else []
            
        except Exception as e:
            logger.error(f"Failed to get sent friend requests for {username}: {e}")
            return []
    
    def get_blocked_users(self, username: str) -> List[Dict[str, Any]]:
        """Get list of blocked users"""
        try:
            user = self.get_user_by_username(username)
            if not user:
                return []
            
            blocked = self.db.execute_query(
                """SELECT f.*, u.username as blocked_username, u.display_name as blocked_display_name
                   FROM friends f
                   JOIN users u ON f.friend_userid = u.userid
                   WHERE f.userid = ? AND f.status = 'blocked'
                   ORDER BY f.updated_at DESC""",
                (user['userid'],),
                fetch='all'
            )
            
            return [dict(block) for block in blocked] if blocked else []
            
        except Exception as e:
            logger.error(f"Failed to get blocked users for {username}: {e}")
            return []
    
    def search_users(self, query: str, current_username: str = None, limit: int = 20) -> List[Dict[str, Any]]:
        """Search for users by username or display name"""
        try:
            # Exclude current user from search
            exclude_clause = ""
            params = (f"%{query}%", f"%{query}%")
            
            if current_username:
                exclude_clause = "AND username != ?"
                params = (f"%{query}%", f"%{query}%", current_username)
            
            users = self.db.execute_query(
                f"""SELECT username, display_name, device_type, last_seen
                   FROM users 
                   WHERE (username LIKE ? OR display_name LIKE ?) 
                   AND is_active = 1 {exclude_clause}
                   ORDER BY last_seen DESC
                   LIMIT ?""",
                params + (limit,),
                fetch='all'
            )
            
            return [dict(user) for user in users] if users else []
            
        except Exception as e:
            logger.error(f"Failed to search users with query '{query}': {e}")
            return []
    
    def add_online_user(self, userid: str) -> bool:
        """Add user to online users table"""
        try:
            return self.db.add_online_user(userid)
        except Exception as e:
            logger.error(f"Failed to add online user {userid}: {e}")
            return False
    
    def remove_online_user(self, userid: str) -> bool:
        """Remove user from online users table"""
        try:
            return self.db.remove_online_user(userid)
        except Exception as e:
            logger.error(f"Failed to remove online user {userid}: {e}")
            return False
    
    def get_online_users(self) -> List[Dict[str, Any]]:
        """Get list of all online users"""
        try:
            return self.db.get_online_users()
        except Exception as e:
            logger.error(f"Failed to get online users: {e}")
            return []
    
    def is_user_online(self, userid: str) -> bool:
        """Check if user is online"""
        try:
            return self.db.is_user_online(userid)
        except Exception as e:
            logger.error(f"Failed to check if user {userid} is online: {e}")
            return False