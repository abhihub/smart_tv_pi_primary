#!/usr/bin/env python3
"""
Debug script to understand SQLite timezone handling
"""

import sqlite3
from datetime import datetime

def debug_timezone():
    """Debug SQLite timezone handling"""
    
    print("🕐 Debugging SQLite Timezone")
    print("=" * 40)
    
    # Connect to database
    conn = sqlite3.connect('database/smarttv.db')
    cursor = conn.cursor()
    
    try:
        # Check current time in different formats
        print("\n1. Current Time Comparison:")
        print(f"   Python datetime.now(): {datetime.now()}")
        print(f"   Python datetime.utcnow(): {datetime.utcnow()}")
        
        # Check SQLite current time
        cursor.execute("SELECT datetime('now')")
        sqlite_now = cursor.fetchone()[0]
        print(f"   SQLite datetime('now'): {sqlite_now}")
        
        cursor.execute("SELECT datetime('now', 'utc')")
        sqlite_utc = cursor.fetchone()[0]
        print(f"   SQLite datetime('now', 'utc'): {sqlite_utc}")
        
        # Check recent user timestamps
        print("\n2. Recent User Timestamps:")
        cursor.execute("""
            SELECT username, last_seen
            FROM users
            ORDER BY last_seen DESC
            LIMIT 3
        """)
        
        users = cursor.fetchall()
        for user in users:
            username, last_seen = user
            print(f"   👤 {username}: {last_seen}")
            
            # Test different time comparisons
            cursor.execute("SELECT ? > datetime('now', '-2 minutes')", (last_seen,))
            is_recent_2min = cursor.fetchone()[0]
            
            cursor.execute("SELECT ? > datetime('now', '-10 minutes')", (last_seen,))
            is_recent_10min = cursor.fetchone()[0]
            
            print(f"      > 2 minutes ago: {is_recent_2min}")
            print(f"      > 10 minutes ago: {is_recent_10min}")
        
        # Test the actual query with different time windows
        print("\n3. Testing Query with Different Windows:")
        
        for minutes in [2, 5, 10, 30]:
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM users
                WHERE last_seen > datetime('now', '-{} minutes')
            """.format(minutes))
            
            count = cursor.fetchone()[0]
            print(f"   {minutes} minutes: {count} users")
        
        # Test with UTC time
        print("\n4. Testing with UTC Time:")
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM users
            WHERE last_seen > datetime('now', 'utc', '-2 minutes')
        """)
        
        count_utc = cursor.fetchone()[0]
        print(f"   UTC 2 minutes: {count_utc} users")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    debug_timezone() 