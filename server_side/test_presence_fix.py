#!/usr/bin/env python3
"""
Test script to verify the presence fix for offline users
"""

import requests
import time
import json

# Configuration
SERVER_URL = "http://localhost:3001"
TEST_USERS = ["TEST1", "TEST2", "TEST3"]

def test_presence_fix():
    """Test the presence fix functionality"""
    
    print("🧪 Testing Presence Fix for Offline Users")
    print("=" * 50)
    
    # Step 1: Register test users
    print("\n1. Registering test users...")
    for username in TEST_USERS:
        try:
            response = requests.post(f"{SERVER_URL}/api/users/register", 
                                   json={"username": username, "device_type": "test"})
            if response.status_code == 200:
                print(f"   ✅ Registered {username}")
            else:
                print(f"   ⚠️  {username} already exists or error: {response.text}")
        except Exception as e:
            print(f"   ❌ Failed to register {username}: {e}")
    
    # Step 2: Mark users as online
    print("\n2. Marking users as online...")
    for username in TEST_USERS:
        try:
            response = requests.post(f"{SERVER_URL}/api/calls/presence", 
                                   json={"username": username, "status": "online"})
            if response.status_code == 200:
                print(f"   ✅ {username} marked as online")
            else:
                print(f"   ❌ Failed to mark {username} as online: {response.text}")
        except Exception as e:
            print(f"   ❌ Error marking {username} as online: {e}")
    
    # Step 3: Check online users (should show all 3)
    print("\n3. Checking online users (should show 3)...")
    try:
        response = requests.get(f"{SERVER_URL}/api/calls/online-users")
        if response.status_code == 200:
            data = response.json()
            online_count = data.get('count', 0)
            online_users = data.get('users', [])
            print(f"   📊 Found {online_count} online users")
            for user in online_users:
                print(f"   👤 {user['username']} - {user['presence_status']}")
        else:
            print(f"   ❌ Failed to get online users: {response.text}")
    except Exception as e:
        print(f"   ❌ Error getting online users: {e}")
    
    # Step 4: Mark one user as offline
    print("\n4. Marking TEST1 as offline...")
    try:
        response = requests.post(f"{SERVER_URL}/api/calls/disconnect", 
                               json={"username": "TEST1"})
        if response.status_code == 200:
            print("   ✅ TEST1 marked as offline")
        else:
            print(f"   ❌ Failed to mark TEST1 as offline: {response.text}")
    except Exception as e:
        print(f"   ❌ Error marking TEST1 as offline: {e}")
    
    # Step 5: Check online users again (should show 2)
    print("\n5. Checking online users again (should show 2)...")
    try:
        response = requests.get(f"{SERVER_URL}/api/calls/online-users")
        if response.status_code == 200:
            data = response.json()
            online_count = data.get('count', 0)
            online_users = data.get('users', [])
            print(f"   📊 Found {online_count} online users")
            for user in online_users:
                print(f"   👤 {user['username']} - {user['presence_status']}")
        else:
            print(f"   ❌ Failed to get online users: {response.text}")
    except Exception as e:
        print(f"   ❌ Error getting online users: {e}")
    
    # Step 6: Test cleanup endpoint
    print("\n6. Testing presence cleanup...")
    try:
        response = requests.post(f"{SERVER_URL}/api/calls/cleanup-presence?minutes=1")
        if response.status_code == 200:
            data = response.json()
            cleaned_count = data.get('cleaned_count', 0)
            print(f"   🧹 Cleaned up {cleaned_count} stale presence records")
        else:
            print(f"   ❌ Failed to cleanup presence: {response.text}")
    except Exception as e:
        print(f"   ❌ Error cleaning up presence: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Presence fix test completed!")
    print("\nExpected behavior:")
    print("- Step 3: Should show 3 online users")
    print("- Step 5: Should show 2 online users (TEST1 should be gone)")
    print("- Step 6: Should clean up any stale records")

if __name__ == "__main__":
    test_presence_fix() 