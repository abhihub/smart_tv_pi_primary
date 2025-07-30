#!/usr/bin/env python3
"""
Test script for Twilio call sync functionality
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.twilio_service import TwilioService
from services.background_service import BackgroundService

def test_twilio_service():
    """Test basic Twilio service functionality"""
    print("🧪 Testing Twilio Service")
    print("=" * 50)
    
    try:
        # Initialize Twilio service
        twilio_service = TwilioService()
        print("✅ Twilio service initialized successfully")
        
        # Test credentials validation
        if twilio_service.validate_credentials():
            print("✅ Twilio credentials are valid")
        else:
            print("❌ Twilio credentials are invalid")
            return False
        
        # Test listing active rooms
        print("\n📋 Testing active rooms listing...")
        active_rooms = twilio_service.list_active_rooms()
        print(f"   Found {len(active_rooms)} active Twilio rooms")
        
        for room in active_rooms:
            print(f"   - Room: {room['unique_name']} (Status: {room['status']})")
            
            # Test getting room status for each active room
            room_status = twilio_service.get_room_status(room['unique_name'])
            print(f"     Participants: {room_status['participant_count']}")
            for participant in room_status['participants']:
                print(f"       - {participant['identity']} ({participant['status']})")
        
        # Test with a non-existent room
        print("\n🔍 Testing non-existent room...")
        fake_room_status = twilio_service.get_room_status("non_existent_room_12345")
        print(f"   Non-existent room exists: {fake_room_status['exists']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Twilio service test failed: {e}")
        return False

def test_background_service():
    """Test background service with Twilio sync"""
    print("\n🧪 Testing Background Service")
    print("=" * 50)
    
    try:
        # Initialize background service
        bg_service = BackgroundService()
        print("✅ Background service initialized")
        
        if bg_service.twilio_service:
            print("✅ Twilio service available in background service")
            
            # Test manual sync
            print("\n🔄 Testing manual Twilio sync...")
            bg_service.sync_calls_with_twilio()
            print("✅ Manual Twilio sync completed")
            
        else:
            print("❌ Twilio service not available in background service")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Background service test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Twilio Call Sync Tests")
    print("=" * 60)
    
    # Check environment variables
    required_vars = ['TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY', 'TWILIO_API_SECRET']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\nPlease set these variables in your .env file")
        return False
    
    print("✅ All required environment variables are set")
    
    # Run tests
    tests = [
        ("Twilio Service", test_twilio_service),
        ("Background Service", test_background_service)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        result = test_func()
        results.append((test_name, result))
        print(f"{'='*50}")
    
    # Summary
    print("\n📊 Test Results Summary")
    print("=" * 30)
    all_passed = True
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if not result:
            all_passed = False
    
    print(f"\nOverall: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)