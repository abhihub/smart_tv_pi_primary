import json
import logging
from datetime import datetime
from typing import Optional, Dict, List, Any
from database.database import db_manager

logger = logging.getLogger(__name__)

class ContactService:
    """Service layer for managing user contacts and connections"""
    
    def __init__(self):
        self.db = db_manager
    
    def add_contact(self, username: str, contact_username: str) -> Dict[str, Any]:
        """Add a user to contact list"""
        try:
            # Get user IDs
            user = self.db.execute_query(
                "SELECT id, username FROM users WHERE username = ?",
                (username,),
                fetch='one'
            )
            contact_user = self.db.execute_query(
                "SELECT id, username, display_name FROM users WHERE username = ?",
                (contact_username,),
                fetch='one'
            )
            
            if not user or not contact_user:
                return {
                    'success': False,
                    'message': 'User or contact user not found'
                }
            
            # Check if contact already exists
            existing_contact = self.db.execute_query(
                "SELECT id FROM user_contacts WHERE user_id = ? AND contact_user_id = ?",
                (user['id'], contact_user['id']),
                fetch='one'
            )
            
            if existing_contact:
                return {
                    'success': False,
                    'message': 'Contact already exists in your contact list'
                }
            
            # Add contact
            self.db.execute_query(
                "INSERT INTO user_contacts (user_id, contact_user_id) VALUES (?, ?)",
                (user['id'], contact_user['id'])
            )
            
            logger.info(f"Contact added: {username} -> {contact_username}")
            
            return {
                'success': True,
                'message': 'Contact added successfully',
                'contact': {
                    'username': contact_user['username'],
                    'display_name': contact_user['display_name'],
                    'added_at': datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to add contact {username} -> {contact_username}: {e}")
            return {
                'success': False,
                'message': f'Database error: {str(e)}'
            }
    
    def remove_contact(self, username: str, contact_username: str) -> bool:
        """Remove a user from contact list"""
        try:
            # Get user IDs
            user = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (username,),
                fetch='one'
            )
            contact_user = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (contact_username,),
                fetch='one'
            )
            
            if not user or not contact_user:
                return False
            
            # Remove contact
            self.db.execute_query(
                "DELETE FROM user_contacts WHERE user_id = ? AND contact_user_id = ?",
                (user['id'], contact_user['id'])
            )
            
            # Check if the contact was removed by checking if it still exists
            remaining_contact = self.db.execute_query(
                "SELECT id FROM user_contacts WHERE user_id = ? AND contact_user_id = ?",
                (user['id'], contact_user['id']),
                fetch='one'
            )
            
            if not remaining_contact:
                logger.info(f"Contact removed: {username} -> {contact_username}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to remove contact {username} -> {contact_username}: {e}")
            return False
    
    def get_contact_list_with_status(self, username: str) -> List[Dict[str, Any]]:
        """Get user's contact list with online status, sorted by online first"""
        try:
            user = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (username,),
                fetch='one'
            )
            
            if not user:
                return []
            
            # Get contacts with presence status
            query = """
                SELECT 
                    u.username,
                    u.display_name,
                    u.last_seen,
                    uc.added_at,
                    uc.is_favorite,
                    COALESCE(up.status, 'offline') as presence_status,
                    up.updated_at as presence_updated_at,
                    CASE 
                        WHEN COALESCE(up.status, 'offline') = 'online' THEN 1 
                        ELSE 0 
                    END as online_priority
                FROM user_contacts uc
                JOIN users u ON uc.contact_user_id = u.id
                LEFT JOIN user_presence up ON u.id = up.user_id
                WHERE uc.user_id = ?
                ORDER BY 
                    online_priority DESC,  -- Online users first
                    uc.is_favorite DESC,   -- Favorites next
                    u.display_name ASC     -- Then alphabetically
            """
            
            results = self.db.execute_query(query, (user['id'],), fetch='all')
            
            contacts = []
            for row in results or []:
                contacts.append({
                    'username': row['username'],
                    'display_name': row['display_name'],
                    'last_seen': row['last_seen'],
                    'added_at': row['added_at'],
                    'is_favorite': bool(row['is_favorite']),
                    'presence_status': row['presence_status'],
                    'is_online': row['presence_status'] == 'online',
                    'presence_updated_at': row['presence_updated_at']
                })
            
            return contacts
            
        except Exception as e:
            logger.error(f"Failed to get contact list for {username}: {e}")
            return []
    
    def get_mutual_contacts(self, username: str) -> List[Dict[str, Any]]:
        """Get users who have this user in their contact list"""
        try:
            user = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (username,),
                fetch='one'
            )
            
            if not user:
                return []
            
            # Get users who have added this user to their contacts
            query = """
                SELECT 
                    u.username,
                    u.display_name,
                    u.last_seen,
                    uc.added_at,
                    COALESCE(up.status, 'offline') as presence_status
                FROM user_contacts uc
                JOIN users u ON uc.user_id = u.id
                LEFT JOIN user_presence up ON u.id = up.user_id
                WHERE uc.contact_user_id = ?
                ORDER BY u.display_name ASC
            """
            
            results = self.db.execute_query(query, (user['id'],), fetch='all')
            
            mutual_contacts = []
            for row in results or []:
                mutual_contacts.append({
                    'username': row['username'],
                    'display_name': row['display_name'],
                    'last_seen': row['last_seen'],
                    'added_at': row['added_at'],
                    'presence_status': row['presence_status'],
                    'is_online': row['presence_status'] == 'online'
                })
            
            return mutual_contacts
            
        except Exception as e:
            logger.error(f"Failed to get mutual contacts for {username}: {e}")
            return []
    
    def search_users(self, query: str, limit: int = 20, exclude_username: str = None) -> List[Dict[str, Any]]:
        """Search for users by username or display name"""
        try:
            search_pattern = f"%{query}%"
            exclude_clause = ""
            params = [search_pattern, search_pattern]
            
            if exclude_username:
                exclude_clause = "AND u.username != ?"
                params.append(exclude_username)
            
            params.append(limit)
            
            search_query = f"""
                SELECT 
                    u.username,
                    u.display_name,
                    u.last_seen,
                    u.device_type,
                    COALESCE(up.status, 'offline') as presence_status
                FROM users u
                LEFT JOIN user_presence up ON u.id = up.user_id
                WHERE (u.username LIKE ? OR u.display_name LIKE ?) {exclude_clause}
                AND u.is_active = 1
                ORDER BY 
                    CASE WHEN u.username = ? THEN 1 ELSE 0 END DESC,  -- Exact username match first
                    CASE WHEN u.display_name = ? THEN 1 ELSE 0 END DESC,  -- Exact display name match next
                    CASE WHEN COALESCE(up.status, 'offline') = 'online' THEN 1 ELSE 0 END DESC,  -- Online users
                    u.display_name ASC
                LIMIT ?
            """
            
            # Add exact match parameters
            params.insert(-1, query)  # For exact username match
            params.insert(-1, query)  # For exact display name match
            
            results = self.db.execute_query(search_query, tuple(params), fetch='all')
            
            users = []
            for row in results or []:
                users.append({
                    'username': row['username'],
                    'display_name': row['display_name'],
                    'last_seen': row['last_seen'],
                    'device_type': row['device_type'],
                    'presence_status': row['presence_status'],
                    'is_online': row['presence_status'] == 'online'
                })
            
            return users
            
        except Exception as e:
            logger.error(f"Failed to search users with query '{query}': {e}")
            return []
    
    def set_favorite_status(self, username: str, contact_username: str, is_favorite: bool) -> bool:
        """Set favorite status for a contact"""
        try:
            # Get user IDs
            user = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (username,),
                fetch='one'
            )
            contact_user = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (contact_username,),
                fetch='one'
            )
            
            if not user or not contact_user:
                return False
            
            # Update favorite status
            result = self.db.execute_query(
                "UPDATE user_contacts SET is_favorite = ? WHERE user_id = ? AND contact_user_id = ?",
                (1 if is_favorite else 0, user['id'], contact_user['id'])
            )
            
            if result:
                logger.info(f"Favorite status updated: {username} -> {contact_username}: {is_favorite}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to set favorite status: {e}")
            return False
    
    def is_contact(self, username: str, contact_username: str) -> bool:
        """Check if one user has another in their contact list"""
        try:
            user = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (username,),
                fetch='one'
            )
            contact_user = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (contact_username,),
                fetch='one'
            )
            
            if not user or not contact_user:
                return False
            
            contact = self.db.execute_query(
                "SELECT id FROM user_contacts WHERE user_id = ? AND contact_user_id = ?",
                (user['id'], contact_user['id']),
                fetch='one'
            )
            
            return contact is not None
            
        except Exception as e:
            logger.error(f"Failed to check contact relationship: {e}")
            return False
    
    def get_contact_stats(self, username: str) -> Dict[str, Any]:
        """Get contact statistics for a user"""
        try:
            user = self.db.execute_query(
                "SELECT id FROM users WHERE username = ?",
                (username,),
                fetch='one'
            )
            
            if not user:
                return {}
            
            # Get contact counts
            total_contacts = self.db.execute_query(
                "SELECT COUNT(*) as count FROM user_contacts WHERE user_id = ?",
                (user['id'],),
                fetch='one'
            )
            
            favorite_contacts = self.db.execute_query(
                "SELECT COUNT(*) as count FROM user_contacts WHERE user_id = ? AND is_favorite = 1",
                (user['id'],),
                fetch='one'
            )
            
            online_contacts = self.db.execute_query(
                """SELECT COUNT(*) as count FROM user_contacts uc
                   JOIN user_presence up ON uc.contact_user_id = up.user_id
                   WHERE uc.user_id = ? AND up.status = 'online'""",
                (user['id'],),
                fetch='one'
            )
            
            mutual_contacts = self.db.execute_query(
                "SELECT COUNT(*) as count FROM user_contacts WHERE contact_user_id = ?",
                (user['id'],),
                fetch='one'
            )
            
            return {
                'total_contacts': total_contacts['count'] if total_contacts else 0,
                'favorite_contacts': favorite_contacts['count'] if favorite_contacts else 0,
                'online_contacts': online_contacts['count'] if online_contacts else 0,
                'mutual_contacts': mutual_contacts['count'] if mutual_contacts else 0
            }
            
        except Exception as e:
            logger.error(f"Failed to get contact stats for {username}: {e}")
            return {}
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get health status and basic statistics"""
        try:
            total_contacts = self.db.execute_query(
                "SELECT COUNT(*) as count FROM user_contacts",
                fetch='one'
            )
            
            unique_users_with_contacts = self.db.execute_query(
                "SELECT COUNT(DISTINCT user_id) as count FROM user_contacts",
                fetch='one'
            )
            
            return {
                'total_contact_relationships': total_contacts['count'] if total_contacts else 0,
                'users_with_contacts': unique_users_with_contacts['count'] if unique_users_with_contacts else 0,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get contact service health status: {e}")
            return {
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }