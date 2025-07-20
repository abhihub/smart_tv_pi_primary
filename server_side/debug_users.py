#!/usr/bin/env python3
"""
Debug script to check database state and understand user visibility issues
"""

import sqlite3
from datetime import datetime, timedelta

def debug_database():
    """Debug the database to see what's happening with users"""
    
    print("🔍 Debugging Database State")
    print("=" * 50)
    
    # Connect to database
    conn = sqlite3.connect('database/smarttv.db')
    cursor = conn.cursor()
    
    try:
        # Check all users
        print("\n1. All Users in Database:")
        cursor.execute("SELECT id, username, last_seen, is_active FROM users ORDER BY last_seen DESC")
        users = cursor.fetchall()
        
        for user in users:
            print(f"   👤 ID: {user[0]}, Username: {user[1]}, Last Seen: {user[2]}, Active: {user[3]}")
        
        # Check user presence
        print("\n2. User Presence Records:")
        cursor.execute("""
            SELECT up.id, up.user_id, up.status, up.last_seen, up.updated_at, u.username
            FROM user_presence up
            JOIN users u ON up.user_id = u.id
            ORDER BY up.updated_at DESC
        """)
        presence = cursor.fetchall()
        
        for p in presence:
            print(f"   📊 ID: {p[0]}, User: {p[5]}, Status: {p[2]}, Last Seen: {p[3]}, Updated: {p[4]}")
        
        # Check recent activity (last 5 minutes)
        print("\n3. Recent Activity (Last 5 minutes):")
        five_minutes_ago = datetime.now() - timedelta(minutes=5)
        cursor.execute("""
            SELECT username, last_seen
            FROM users
            WHERE last_seen > ?
            ORDER BY last_seen DESC
        """, (five_minutes_ago.isoformat(),))
        
        recent = cursor.fetchall()
        for r in recent:
            print(f"   ⏰ {r[0]} - {r[1]}")
        
        # Test the actual query that's failing
        print("\n4. Testing Online Users Query:")
        two_minutes_ago = datetime.now() - timedelta(minutes=2)
        
        print(f"   Current time: {datetime.now()}")
        print(f"   Two minutes ago: {two_minutes_ago}")
        print(f"   Two minutes ago (ISO): {two_minutes_ago.isoformat()}")
        
        # Test with different timestamp formats
        print("\n   Testing timestamp comparisons:")
        cursor.execute("SELECT username, last_seen FROM users ORDER BY last_seen DESC LIMIT 3")
        recent_users = cursor.fetchall()
        
        for user in recent_users:
            username, last_seen = user
            print(f"     {username}: {last_seen} (type: {type(last_seen)})")
            
            # Try to parse the timestamp
            try:
                if isinstance(last_seen, str):
                    # Try different parsing methods
                    parsed_dt = datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
                else:
                    parsed_dt = datetime.fromisoformat(str(last_seen).replace('Z', '+00:00'))
                
                is_recent = parsed_dt > two_minutes_ago
                print(f"       Parsed: {parsed_dt}, Is recent: {is_recent}")
            except Exception as e:
                print(f"       Parse error: {e}")
        
        query = """
            SELECT u.username, u.display_name, u.last_seen,
                   COALESCE(up.status, 'online') as presence_status,
                   up.updated_at as presence_updated
            FROM users u
            LEFT JOIN user_presence up ON u.id = up.user_id
            WHERE u.last_seen > ?
            ORDER BY u.last_seen DESC
        """
        
        cursor.execute(query, (two_minutes_ago.isoformat(),))
        online_users = cursor.fetchall()
        
        print(f"   📊 Found {len(online_users)} users with recent activity:")
        for user in online_users:
            print(f"   👤 {user[0]} - Last Seen: {user[2]}, Status: {user[3]}")
        
        # Try with a more permissive query
        print("\n5. Testing More Permissive Query (last 10 minutes):")
        ten_minutes_ago = datetime.now() - timedelta(minutes=10)
        cursor.execute(query, (ten_minutes_ago.isoformat(),))
        more_users = cursor.fetchall()
        
        print(f"   📊 Found {len(more_users)} users with activity in last 10 minutes:")
        for user in more_users:
            print(f"   👤 {user[0]} - Last Seen: {user[2]}, Status: {user[3]}")
        
        # Try with raw datetime comparison
        print("\n6. Testing Raw Datetime Query:")
        cursor.execute("""
            SELECT u.username, u.last_seen
            FROM users u
            WHERE u.last_seen > datetime('now', '-2 minutes')
            ORDER BY u.last_seen DESC
        """)
        raw_users = cursor.fetchall()
        
        print(f"   📊 Found {len(raw_users)} users with raw datetime query:")
        for user in raw_users:
            print(f"   👤 {user[0]} - Last Seen: {user[1]}")
        
        # Check for users without presence records
        print("\n7. Users Without Presence Records:")
        cursor.execute("""
            SELECT u.username, u.last_seen
            FROM users u
            LEFT JOIN user_presence up ON u.id = up.user_id
            WHERE up.id IS NULL
            ORDER BY u.last_seen DESC
        """)
        
        no_presence = cursor.fetchall()
        for user in no_presence:
            print(f"   ⚠️  {user[0]} - No presence record, Last Seen: {user[1]}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    debug_database() 