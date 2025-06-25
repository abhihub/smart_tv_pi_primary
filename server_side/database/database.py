import sqlite3
import os
import logging
from datetime import datetime
from typing import Optional, Dict, Any
import json

logger = logging.getLogger(__name__)

class DatabaseManager:
    """SQLite database manager for SmartTV application"""
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            # Default to database folder in server_side directory
            db_dir = os.path.join(os.path.dirname(__file__))
            os.makedirs(db_dir, exist_ok=True)
            db_path = os.path.join(db_dir, 'smarttv.db')
        
        self.db_path = db_path
        self.init_database()
    
    def get_connection(self) -> sqlite3.Connection:
        """Get a database connection with row factory"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Enable column access by name
        return conn
    
    def init_database(self):
        """Initialize database with schema"""
        try:
            schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
            
            with open(schema_path, 'r') as f:
                schema_sql = f.read()
            
            with self.get_connection() as conn:
                conn.executescript(schema_sql)
                conn.commit()
                logger.info(f"Database initialized at {self.db_path}")
                
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    def execute_query(self, query: str, params: tuple = (), fetch: str = None):
        """Execute a query with optional fetch mode"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                
                if fetch == 'one':
                    return cursor.fetchone()
                elif fetch == 'all':
                    return cursor.fetchall()
                else:
                    conn.commit()
                    return cursor.lastrowid
                    
        except Exception as e:
            logger.error(f"Database query failed: {e}")
            raise
    
    def health_check(self) -> Dict[str, Any]:
        """Perform database health check"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) as user_count FROM users")
                user_count = cursor.fetchone()['user_count']
                
                cursor.execute("SELECT COUNT(*) as active_sessions FROM user_sessions WHERE is_active = 1")
                active_sessions = cursor.fetchone()['active_sessions']
                
                return {
                    'status': 'healthy',
                    'db_path': self.db_path,
                    'total_users': user_count,
                    'active_sessions': active_sessions,
                    'timestamp': datetime.now().isoformat()
                }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

# Global database instance
db_manager = DatabaseManager()