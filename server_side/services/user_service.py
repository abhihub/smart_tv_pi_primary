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
    
    def register_or_update_user(self, username: str, display_name: str = None, 
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
                    'user_id': user_data['id'],
                    'username': user_data['username'],
                    'display_name': user_data['display_name'],
                    'is_new_user': False,
                    'last_seen': user_data['last_seen']
                }
            else:
                # Create new user
                metadata_json = json.dumps(metadata or {})
                
                user_id = self.db.execute_query(
                    """INSERT INTO users (username, display_name, device_type, metadata) 
                       VALUES (?, ?, ?, ?)""",
                    (username, display_name or username, device_type, metadata_json)
                )
                
                logger.info(f"New user {username} registered with ID {user_id}")
                return {
                    'user_id': user_id,
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
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            result = self.db.execute_query(
                "SELECT * FROM users WHERE id = ?",
                (user_id,),
                fetch='one'
            )
            return dict(result) if result else None
        except Exception as e:
            logger.error(f"Failed to get user by ID {user_id}: {e}")
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
                logger.warning(f"Cannot create session for non-existent user: {username}")
                return None
            
            # Generate session token (simple timestamp-based for now)
            session_token = f"{username}_{int(datetime.now().timestamp())}"
            
            # End any existing active sessions for this user
            self.db.execute_query(
                """UPDATE user_sessions 
                   SET is_active = 0, ended_at = CURRENT_TIMESTAMP 
                   WHERE user_id = ? AND is_active = 1""",
                (user['id'],)
            )
            
            # Create new session
            self.db.execute_query(
                """INSERT INTO user_sessions (user_id, session_token, session_type, room_name) 
                   VALUES (?, ?, ?, ?)""",
                (user['id'], session_token, session_type, room_name)
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
                   WHERE user_id = ?""",
                (user['id'],),
                fetch='one'
            )
            
            # Get session stats
            session_stats = self.db.execute_query(
                """SELECT 
                     COUNT(*) as total_sessions,
                     COUNT(CASE WHEN session_type = 'video_call' THEN 1 END) as video_sessions,
                     COUNT(CASE WHEN session_type = 'trivia_game' THEN 1 END) as trivia_sessions
                   FROM user_sessions 
                   WHERE user_id = ?""",
                (user['id'],),
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
                   (user_id, game_type, score, questions_answered, correct_answers, 
                    game_duration, room_name) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (user['id'], game_type, score, questions_answered, correct_answers,
                 game_duration, room_name)
            )
            
            logger.info(f"Saved {game_type} score {score} for {username}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save game score for {username}: {e}")
            return False