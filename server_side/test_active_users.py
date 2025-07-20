#!/usr/bin/env python3
"""
Test script to simulate active users and verify the online users fix
"""

import requests
import time
from datetime import datetime

def test_online_users():
    """Test the online users functionality"""
    
    base_url = "http://localhost:3001"
    
    print("🧪 Testing Online Users Fix")
    print("=" * 40)
    
    # Test 1: Check current online users
    print("\n1. Checking current online users:")
    response = requests.get(f"{base_url}/api/calls/online-users")
    if response.status_code == 200:
        data = response.json()
        print(f"   📊 Found {data['count']} online users")
        for user in data['users']:
            print(f"   👤 {user['username']} - Status: {user['presence_status']}")
    else:
        print(f"   ❌ Error: {response.status_code}")
    
    # Test 2: Update a user's presence to simulate activity
    print("\n2. Simulating user activity:")
    test_username = "K9FH4"
    
    # Update presence
    presence_data = {"username": test_username, "status": "online"}
    response = requests.post(f"{base_url}/api/calls/presence", json=presence_data)
    if response.status_code == 200:
        print(f"   ✅ Updated presence for {test_username}")
    else:
        print(f"   ❌ Failed to update presence: {response.status_code}")
    
    # Update last seen
    session_data = {"username": test_username}
    response = requests.post(f"{base_url}/api/users/session/start", json=session_data)
    if response.status_code == 200:
        print(f"   ✅ Updated last seen for {test_username}")
    else:
        print(f"   ❌ Failed to update last seen: {response.status_code}")
    
    # Test 3: Check online users again
    print("\n3. Checking online users after activity:")
    time.sleep(1)  # Wait a moment for the update to process
    
    response = requests.get(f"{base_url}/api/calls/online-users")
    if response.status_code == 200:
        data = response.json()
        print(f"   📊 Found {data['count']} online users")
        for user in data['users']:
            print(f"   👤 {user['username']} - Status: {user['presence_status']}")
            
        # Check if our test user is online
        test_user_found = any(user['username'] == test_username for user in data['users'])
        if test_user_found:
            print(f"   ✅ {test_username} is now showing as online!")
        else:
            print(f"   ❌ {test_username} is not showing as online")
    else:
        print(f"   ❌ Error: {response.status_code}")
    
    # Test 4: Test with exclusion
    print(f"\n4. Testing with exclusion ({test_username}):")
    response = requests.get(f"{base_url}/api/calls/online-users?exclude_user={test_username}")
    if response.status_code == 200:
        data = response.json()
        print(f"   📊 Found {data['count']} online users (excluding {test_username})")
        for user in data['users']:
            print(f"   👤 {user['username']} - Status: {user['presence_status']}")
            
        # Check that our test user is excluded
        test_user_excluded = not any(user['username'] == test_username for user in data['users'])
        if test_user_excluded:
            print(f"   ✅ {test_username} correctly excluded from results")
        else:
            print(f"   ❌ {test_username} should have been excluded")
    else:
        print(f"   ❌ Error: {response.status_code}")

if __name__ == "__main__":
    test_online_users() 