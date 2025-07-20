#!/usr/bin/env python3
"""
Script to fix existing users who don't have presence records
"""

import sqlite3
from datetime import datetime

def fix_existing_users():
    """Fix existing users who don't have presence records"""
    
    print("🔧 Fixing Existing Users Without Presence Records")
    print("=" * 50)
    
    # Connect to database
    conn = sqlite3.connect('database/smarttv.db')
    cursor = conn.cursor()
    
    try:
        # Find users without presence records
        cursor.execute("""
            SELECT u.id, u.username, u.last_seen
            FROM users u
            LEFT JOIN user_presence up ON u.id = up.user_id
            WHERE up.id IS NULL
            ORDER BY u.last_seen DESC
        """)
        
        users_without_presence = cursor.fetchall()
        
        if not users_without_presence:
            print("✅ All users already have presence records!")
            return
        
        print(f"Found {len(users_without_presence)} users without presence records:")
        
        # Create presence records for each user
        for user in users_without_presence:
            user_id, username, last_seen = user
            print(f"   👤 Creating presence record for {username} (ID: {user_id})")
            
            # Check if user was active recently (within last 5 minutes)
            last_seen_dt = datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
            five_minutes_ago = datetime.now().replace(tzinfo=last_seen_dt.tzinfo) - timedelta(minutes=5)
            
            status = 'online' if last_seen_dt > five_minutes_ago else 'offline'
            
            cursor.execute("""
                INSERT INTO user_presence (user_id, status, updated_at)
                VALUES (?, ?, ?)
            """, (user_id, status, datetime.now().isoformat()))
            
            print(f"      ✅ Created presence record with status: {status}")
        
        # Commit changes
        conn.commit()
        print(f"\n✅ Successfully created {len(users_without_presence)} presence records!")
        
        # Verify the fix
        print("\n🔍 Verifying the fix:")
        cursor.execute("""
            SELECT u.username, up.status, u.last_seen
            FROM users u
            LEFT JOIN user_presence up ON u.id = up.user_id
            ORDER BY u.last_seen DESC
        """)
        
        all_users = cursor.fetchall()
        for user in all_users:
            username, status, last_seen = user
            print(f"   👤 {username} - Status: {status or 'NO PRESENCE'}, Last Seen: {last_seen}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    from datetime import timedelta
    fix_existing_users() 