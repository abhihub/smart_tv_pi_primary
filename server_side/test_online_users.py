#!/usr/bin/env python3
"""
Test script for online users functionality
"""

import requests
import json
import time
from datetime import datetime

def test_online_users():
    """Test online users functionality"""
    base_url = "http://localhost:3001"
    
    # Test data
    test_user = {
        "userid": "APP123456789",
        "username": "TEST1",
        "display_name": "Test User",
        "device_type": "smarttv"
    }
    
    print("Testing Online Users Functionality")
    print("=" * 50)
    
    # First register the user
    print("\n1. Registering test user...")
    response = requests.post(f"{base_url}/api/users/register", json=test_user)
    if response.status_code == 200:
        print("✓ User registered successfully")
    else:
        print(f"✗ User registration failed: {response.status_code}")
        print(response.text)
        return
    
    # Test connecting user (mark as online)
    print("\n2. Testing user connect (mark as online)...")
    response = requests.post(f"{base_url}/api/users/online/connect", json={"userid": test_user["userid"]})
    if response.status_code == 200:
        print("✓ User marked as online successfully")
        print(f"Response: {response.json()}")
    else:
        print(f"✗ Failed to mark user as online: {response.status_code}")
        print(response.text)
    
    # Test getting online users
    print("\n3. Testing get online users...")
    response = requests.get(f"{base_url}/api/users/online")
    if response.status_code == 200:
        data = response.json()
        print("✓ Retrieved online users successfully")
        print(f"Online users count: {data['count']}")
        print(f"Online users: {json.dumps(data['online_users'], indent=2)}")
    else:
        print(f"✗ Failed to get online users: {response.status_code}")
        print(response.text)
    
    # Test checking if user is online
    print("\n4. Testing check user online status...")
    response = requests.get(f"{base_url}/api/users/online/check/{test_user['userid']}")
    if response.status_code == 200:
        data = response.json()
        print("✓ Checked user online status successfully")
        print(f"User {test_user['userid']} is online: {data['is_online']}")
    else:
        print(f"✗ Failed to check user online status: {response.status_code}")
        print(response.text)
    
    # Test disconnecting user (remove from online)
    print("\n5. Testing user disconnect (remove from online)...")
    response = requests.post(f"{base_url}/api/users/online/disconnect", json={"userid": test_user["userid"]})
    if response.status_code == 200:
        print("✓ User removed from online successfully")
        print(f"Response: {response.json()}")
    else:
        print(f"✗ Failed to remove user from online: {response.status_code}")
        print(response.text)
    
    # Test getting online users again (should be empty)
    print("\n6. Testing get online users after disconnect...")
    response = requests.get(f"{base_url}/api/users/online")
    if response.status_code == 200:
        data = response.json()
        print("✓ Retrieved online users successfully")
        print(f"Online users count after disconnect: {data['count']}")
        print(f"Online users: {json.dumps(data['online_users'], indent=2)}")
    else:
        print(f"✗ Failed to get online users: {response.status_code}")
        print(response.text)
    
    # Test checking if user is online after disconnect
    print("\n7. Testing check user online status after disconnect...")
    response = requests.get(f"{base_url}/api/users/online/check/{test_user['userid']}")
    if response.status_code == 200:
        data = response.json()
        print("✓ Checked user online status successfully")
        print(f"User {test_user['userid']} is online: {data['is_online']}")
    else:
        print(f"✗ Failed to check user online status: {response.status_code}")
        print(response.text)
    
    print("\n" + "=" * 50)
    print("Online Users Test Complete!")

if __name__ == "__main__":
    test_online_users()