#!/usr/bin/env python3
"""
Script to clean out all users, user sessions, and user presence from the database
"""

import sqlite3
import os

def cleanup_database():
    """Clean out all user-related data from the database"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'database', 'smarttv.db')
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found at: {db_path}")
        return
    
    print(f"🗂️ Cleaning database: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get counts before deletion
        print("\n📊 Before cleanup:")
        
        cursor.execute("SELECT COUNT(*) FROM users")
        users_count = cursor.fetchone()[0]
        print(f"   👥 Users: {users_count}")
        
        cursor.execute("SELECT COUNT(*) FROM user_sessions")
        sessions_count = cursor.fetchone()[0]
        print(f"   🔄 User Sessions: {sessions_count}")
        
        cursor.execute("SELECT COUNT(*) FROM user_presence")
        presence_count = cursor.fetchone()[0]
        print(f"   🟢 User Presence: {presence_count}")
        
        cursor.execute("SELECT COUNT(*) FROM calls")
        calls_count = cursor.fetchone()[0]
        print(f"   📞 Calls: {calls_count}")
        
        cursor.execute("SELECT COUNT(*) FROM game_scores")
        scores_count = cursor.fetchone()[0]
        print(f"   🎮 Game Scores: {scores_count}")
        
        # Clean up all user-related data
        print("\n🧹 Cleaning up...")
        
        # Delete in order to respect foreign key constraints
        cursor.execute("DELETE FROM user_presence")
        print("   ✅ Cleared user_presence table")
        
        cursor.execute("DELETE FROM user_sessions")
        print("   ✅ Cleared user_sessions table")
        
        cursor.execute("DELETE FROM calls")
        print("   ✅ Cleared calls table")
        
        cursor.execute("DELETE FROM game_scores")
        print("   ✅ Cleared game_scores table")
        
        cursor.execute("DELETE FROM users")
        print("   ✅ Cleared users table")
        
        # Reset auto-increment sequences
        cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('users', 'user_sessions', 'user_presence', 'calls', 'game_scores')")
        print("   ✅ Reset auto-increment sequences")
        
        # Commit changes
        conn.commit()
        
        # Verify cleanup
        print("\n📊 After cleanup:")
        
        cursor.execute("SELECT COUNT(*) FROM users")
        users_count = cursor.fetchone()[0]
        print(f"   👥 Users: {users_count}")
        
        cursor.execute("SELECT COUNT(*) FROM user_sessions")
        sessions_count = cursor.fetchone()[0]
        print(f"   🔄 User Sessions: {sessions_count}")
        
        cursor.execute("SELECT COUNT(*) FROM user_presence")
        presence_count = cursor.fetchone()[0]
        print(f"   🟢 User Presence: {presence_count}")
        
        cursor.execute("SELECT COUNT(*) FROM calls")
        calls_count = cursor.fetchone()[0]
        print(f"   📞 Calls: {calls_count}")
        
        cursor.execute("SELECT COUNT(*) FROM game_scores")
        scores_count = cursor.fetchone()[0]
        print(f"   🎮 Game Scores: {scores_count}")
        
        print("\n✅ Database cleanup completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    cleanup_database()