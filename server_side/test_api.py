#!/usr/bin/env python3
"""
Comprehensive API Testing Script for SmartTV Server
Tests all database API endpoints and functionality
"""

import requests
import json
import uuid
import time
import random
import string
from datetime import datetime
from typing import Dict, List, Any, Optional
import sys
import os

class SmartTVAPITester:
    def __init__(self, base_url: str = "http://20.244.19.161:3001"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.test_data = {}
        self.passed_tests = 0
        self.failed_tests = 0
        self.test_results = []
        
        # Test user data
        self.test_users = [
            {
                "userid": f"APP{random.randint(100000, 999999)}",
                "username": self._generate_username(),
                "display_name": "Test User 1",
                "device_type": "smarttv",
                "metadata": {"device_model": "Samsung TV", "app_version": "1.0.0"}
            },
            {
                "userid": f"APP{random.randint(100000, 999999)}",
                "username": self._generate_username(),
                "display_name": "Test User 2",
                "device_type": "smarttv",
                "metadata": {"device_model": "LG TV", "app_version": "1.0.0"}
            }
        ]

    def _generate_username(self) -> str:
        """Generate a 5-character alphanumeric username"""
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))

    def _log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        status = "PASS" if passed else "FAIL"
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        if passed:
            self.passed_tests += 1
            print(f"✅ {test_name}: {status}")
        else:
            self.failed_tests += 1
            print(f"❌ {test_name}: {status} - {details}")
        
        if details:
            print(f"   Details: {details}")

    def _make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.request(method, url, timeout=10, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            raise

    def test_server_health(self):
        """Test basic server health endpoints"""
        print("\n🔍 Testing Server Health...")
        
        # Test root endpoint
        try:
            response = self._make_request('GET', '/')
            self._log_test("Server Root Endpoint", 
                          response.status_code == 200 and 'SmartTV' in response.text)
        except Exception as e:
            self._log_test("Server Root Endpoint", False, str(e))

        # Test health endpoint
        try:
            response = self._make_request('GET', '/health')
            self._log_test("Server Health Endpoint", 
                          response.status_code == 200 and 'healthy' in response.text)
        except Exception as e:
            self._log_test("Server Health Endpoint", False, str(e))

    def test_user_registration(self):
        """Test user registration and profile management"""
        print("\n👤 Testing User Registration...")
        
        for i, user_data in enumerate(self.test_users):
            # Test user registration
            try:
                response = self._make_request('POST', '/api/users/register', json=user_data)
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    success = data.get('success', False)
                    self.test_data[f'user_{i+1}'] = user_data
                
                self._log_test(f"User Registration {i+1}", success, 
                              f"Status: {response.status_code}")
                
            except Exception as e:
                self._log_test(f"User Registration {i+1}", False, str(e))

        # Test duplicate registration (should update existing)
        try:
            response = self._make_request('POST', '/api/users/register', 
                                        json=self.test_users[0])
            success = response.status_code == 200
            self._log_test("Duplicate User Registration", success)
        except Exception as e:
            self._log_test("Duplicate User Registration", False, str(e))

    def test_user_validation(self):
        """Test user input validation"""
        print("\n🔍 Testing User Input Validation...")
        
        # Test missing userid
        try:
            invalid_data = {"username": "ABC12", "display_name": "Test"}
            response = self._make_request('POST', '/api/users/register', json=invalid_data)
            self._log_test("Missing userid Validation", response.status_code == 400)
        except Exception as e:
            self._log_test("Missing userid Validation", False, str(e))

        # Test invalid username (wrong length)
        try:
            invalid_data = {"userid": "APP123456", "username": "ABC"}
            response = self._make_request('POST', '/api/users/register', json=invalid_data)
            self._log_test("Invalid Username Length", response.status_code == 400)
        except Exception as e:
            self._log_test("Invalid Username Length", False, str(e))

        # Test non-alphanumeric username
        try:
            invalid_data = {"userid": "APP123456", "username": "ABC!@"}
            response = self._make_request('POST', '/api/users/register', json=invalid_data)
            self._log_test("Non-alphanumeric Username", response.status_code == 400)
        except Exception as e:
            self._log_test("Non-alphanumeric Username", False, str(e))

    def test_user_profile_operations(self):
        """Test user profile retrieval and updates"""
        print("\n📋 Testing User Profile Operations...")
        
        if not self.test_data.get('user_1'):
            print("Skipping profile tests - no registered users")
            return

        user = self.test_data['user_1']
        username = user['username']

        # Test profile retrieval
        try:
            response = self._make_request('GET', f'/api/users/profile/{username}')
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get('success', False) and 'user' in data
            self._log_test("User Profile Retrieval", success)
        except Exception as e:
            self._log_test("User Profile Retrieval", False, str(e))

        # Test profile update
        try:
            update_data = {
                "display_name": "Updated Display Name",
                "metadata": {"updated": True}
            }
            response = self._make_request('PUT', f'/api/users/profile/{username}', 
                                        json=update_data)
            success = response.status_code == 200
            self._log_test("User Profile Update", success)
        except Exception as e:
            self._log_test("User Profile Update", False, str(e))

        # Test non-existent user profile
        try:
            response = self._make_request('GET', '/api/users/profile/NONEX')
            self._log_test("Non-existent User Profile", response.status_code == 404)
        except Exception as e:
            self._log_test("Non-existent User Profile", False, str(e))

    def test_user_sessions(self):
        """Test user session management"""
        print("\n🔄 Testing User Sessions...")
        
        if not self.test_data.get('user_1'):
            print("Skipping session tests - no registered users")
            return

        user = self.test_data['user_1']
        username = user['username']

        # Test session start
        try:
            session_data = {
                "username": username,
                "session_type": "video_call",
                "room_name": f"test_room_{int(time.time())}"
            }
            response = self._make_request('POST', '/api/users/session/start', 
                                        json=session_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = data.get('success', False)
                if success and 'session_token' in data:
                    self.test_data['session_token'] = data['session_token']
            
            self._log_test("Session Start", success)
        except Exception as e:
            self._log_test("Session Start", False, str(e))

        # Test session end
        if self.test_data.get('session_token'):
            try:
                end_data = {"session_token": self.test_data['session_token']}
                response = self._make_request('POST', '/api/users/session/end', 
                                            json=end_data)
                success = response.status_code == 200
                self._log_test("Session End", success)
            except Exception as e:
                self._log_test("Session End", False, str(e))

    def test_game_scores(self):
        """Test game score functionality"""
        print("\n🎮 Testing Game Scores...")
        
        if not self.test_data.get('user_1'):
            print("Skipping game score tests - no registered users")
            return

        user = self.test_data['user_1']
        username = user['username']

        # Test save game score
        try:
            score_data = {
                "username": username,
                "game_type": "trivia",
                "score": 85,
                "questions_answered": 10,
                "correct_answers": 8,
                "game_duration": 300,
                "room_name": "test_room"
            }
            response = self._make_request('POST', '/api/users/game/score', 
                                        json=score_data)
            success = response.status_code == 200
            self._log_test("Save Game Score", success)
        except Exception as e:
            self._log_test("Save Game Score", False, str(e))

    def test_friend_system(self):
        """Test friend system functionality"""
        print("\n👥 Testing Friend System...")
        
        if len([k for k in self.test_data.keys() if k.startswith('user_')]) < 2:
            print("Skipping friend tests - need at least 2 users")
            return

        user1 = self.test_data['user_1']
        user2 = self.test_data['user_2']

        # Test send friend request
        try:
            request_data = {
                "sender": user1['username'],
                "receiver": user2['username'],
                "message": "Let's be friends!"
            }
            response = self._make_request('POST', '/api/users/friends/request', 
                                        json=request_data)
            success = response.status_code == 200
            self._log_test("Send Friend Request", success)
        except Exception as e:
            self._log_test("Send Friend Request", False, str(e))

        # Test accept friend request
        try:
            accept_data = {
                "sender": user1['username'],
                "receiver": user2['username']
            }
            response = self._make_request('POST', '/api/users/friends/accept', 
                                        json=accept_data)
            success = response.status_code == 200
            self._log_test("Accept Friend Request", success)
        except Exception as e:
            self._log_test("Accept Friend Request", False, str(e))

        # Test get friends list
        try:
            response = self._make_request('GET', f'/api/users/friends/{user1["username"]}')
            success = response.status_code == 200
            self._log_test("Get Friends List", success)
        except Exception as e:
            self._log_test("Get Friends List", False, str(e))

        # Test block user
        try:
            block_data = {
                "username": user1['username'],
                "blocked_username": user2['username']
            }
            response = self._make_request('POST', '/api/users/friends/block', 
                                        json=block_data)
            success = response.status_code == 200
            self._log_test("Block User", success)
        except Exception as e:
            self._log_test("Block User", False, str(e))

        # Test unblock user
        try:
            unblock_data = {
                "username": user1['username'],
                "blocked_username": user2['username']
            }
            response = self._make_request('POST', '/api/users/friends/unblock', 
                                        json=unblock_data)
            success = response.status_code == 200
            self._log_test("Unblock User", success)
        except Exception as e:
            self._log_test("Unblock User", False, str(e))

    def test_call_system(self):
        """Test call system functionality"""
        print("\n📞 Testing Call System...")
        
        if len([k for k in self.test_data.keys() if k.startswith('user_')]) < 2:
            print("Skipping call tests - need at least 2 users")
            return

        user1 = self.test_data['user_1']
        user2 = self.test_data['user_2']

        # Test get online users
        try:
            response = self._make_request('GET', '/api/calls/online-users')
            success = response.status_code == 200
            self._log_test("Get Online Users", success)
        except Exception as e:
            self._log_test("Get Online Users", False, str(e))

        # Test create call
        try:
            call_data = {
                "creator": user1['username'],
                "call_type": "video",
                "meeting_title": "Test Meeting",
                "max_participants": 10
            }
            response = self._make_request('POST', '/api/calls/create', json=call_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if data.get('success') and 'call' in data:
                    self.test_data['call_id'] = data['call']['call_id']
            
            self._log_test("Create Call", success)
        except Exception as e:
            self._log_test("Create Call", False, str(e))

        # Test join call
        if self.test_data.get('call_id'):
            try:
                join_data = {
                    "call_id": self.test_data['call_id'],
                    "username": user2['username']
                }
                response = self._make_request('POST', '/api/calls/join', json=join_data)
                success = response.status_code == 200
                self._log_test("Join Call", success)
            except Exception as e:
                self._log_test("Join Call", False, str(e))

        # Test call status
        if self.test_data.get('call_id'):
            try:
                response = self._make_request('GET', f'/api/calls/status/{self.test_data["call_id"]}')
                success = response.status_code == 200
                self._log_test("Get Call Status", success)
            except Exception as e:
                self._log_test("Get Call Status", False, str(e))

        # Test leave call
        if self.test_data.get('call_id'):
            try:
                leave_data = {
                    "call_id": self.test_data['call_id'],
                    "username": user2['username']
                }
                response = self._make_request('POST', '/api/calls/leave', json=leave_data)
                success = response.status_code == 200
                self._log_test("Leave Call", success)
            except Exception as e:
                self._log_test("Leave Call", False, str(e))

        # Test end call
        if self.test_data.get('call_id'):
            try:
                end_data = {
                    "call_id": self.test_data['call_id'],
                    "username": user1['username']
                }
                response = self._make_request('POST', '/api/calls/end', json=end_data)
                success = response.status_code == 200
                self._log_test("End Call", success)
            except Exception as e:
                self._log_test("End Call", False, str(e))

    def test_presence_system(self):
        """Test user presence functionality"""
        print("\n🟢 Testing Presence System...")
        
        if not self.test_data.get('user_1'):
            print("Skipping presence tests - no registered users")
            return

        user = self.test_data['user_1']

        # Test update presence
        try:
            presence_data = {
                "username": user['username'],
                "status": "online",
                "socket_id": f"socket_{int(time.time())}"
            }
            response = self._make_request('POST', '/api/calls/presence', 
                                        json=presence_data)
            success = response.status_code == 200
            self._log_test("Update Presence", success)
        except Exception as e:
            self._log_test("Update Presence", False, str(e))

        # Test get active users
        try:
            response = self._make_request('GET', '/api/users/active?limit=10')
            success = response.status_code == 200
            self._log_test("Get Active Users", success)
        except Exception as e:
            self._log_test("Get Active Users", False, str(e))

    def test_search_functionality(self):
        """Test user search functionality"""
        print("\n🔍 Testing Search Functionality...")
        
        if not self.test_data.get('user_1'):
            print("Skipping search tests - no registered users")
            return

        user = self.test_data['user_1']

        # Test user search
        try:
            search_query = user['username'][:3]  # Search with partial username
            response = self._make_request('GET', f'/api/users/search?q={search_query}&limit=10')
            success = response.status_code == 200
            self._log_test("User Search", success)
        except Exception as e:
            self._log_test("User Search", False, str(e))

        # Test empty search
        try:
            response = self._make_request('GET', '/api/users/search?q=&limit=10')
            success = response.status_code == 200
            if success:
                data = response.json()
                success = len(data.get('users', [])) == 0  # Should return empty
            self._log_test("Empty Search Query", success)
        except Exception as e:
            self._log_test("Empty Search Query", False, str(e))

    def test_system_endpoints(self):
        """Test system management endpoints"""
        print("\n⚙️ Testing System Endpoints...")
        
        # Test system shutdown (without confirmation - should fail)
        try:
            response = self._make_request('POST', '/api/system/shutdown', json={})
            success = response.status_code == 400  # Should fail without confirmation
            self._log_test("System Shutdown (No Confirmation)", success)
        except Exception as e:
            self._log_test("System Shutdown (No Confirmation)", False, str(e))

        # Test system reboot (without confirmation - should fail)
        try:
            response = self._make_request('POST', '/api/system/reboot', json={})
            success = response.status_code == 400  # Should fail without confirmation
            self._log_test("System Reboot (No Confirmation)", success)
        except Exception as e:
            self._log_test("System Reboot (No Confirmation)", False, str(e))

    def test_health_endpoints(self):
        """Test service health endpoints"""
        print("\n🏥 Testing Health Endpoints...")
        
        # Test user service health
        try:
            response = self._make_request('GET', '/api/users/health')
            success = response.status_code == 200
            self._log_test("User Service Health", success)
        except Exception as e:
            self._log_test("User Service Health", False, str(e))

        # Test call service health
        try:
            response = self._make_request('GET', '/api/calls/health')
            success = response.status_code == 200
            self._log_test("Call Service Health", success)
        except Exception as e:
            self._log_test("Call Service Health", False, str(e))

    def test_error_handling(self):
        """Test error handling and edge cases"""
        print("\n⚠️ Testing Error Handling...")
        
        # Test malformed JSON
        try:
            response = self._make_request('POST', '/api/users/register', 
                                        data="invalid json", 
                                        headers={'Content-Type': 'application/json'})
            success = response.status_code in [400, 422, 500]
            self._log_test("Malformed JSON Handling", success)
        except Exception as e:
            self._log_test("Malformed JSON Handling", True, "Request properly rejected")

        # Test non-existent endpoint
        try:
            response = self._make_request('GET', '/api/nonexistent')
            success = response.status_code == 404
            self._log_test("Non-existent Endpoint", success)
        except Exception as e:
            self._log_test("Non-existent Endpoint", False, str(e))

        # Test invalid method
        try:
            response = self._make_request('DELETE', '/api/users/register')
            success = response.status_code == 405  # Method not allowed
            self._log_test("Invalid HTTP Method", success)
        except Exception as e:
            self._log_test("Invalid HTTP Method", False, str(e))

    def cleanup_test_data(self):
        """Clean up test data (if cleanup endpoints exist)"""
        print("\n🧹 Cleaning up test data...")
        
        # Test call cleanup
        try:
            cleanup_data = {"hours": 0}  # Clean up all calls
            response = self._make_request('POST', '/api/calls/cleanup', json=cleanup_data)
            success = response.status_code == 200
            self._log_test("Call Cleanup", success)
        except Exception as e:
            self._log_test("Call Cleanup", False, str(e))

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting SmartTV API Test Suite")
        print(f"Testing server at: {self.base_url}")
        print("=" * 60)

        # Run all test categories
        self.test_server_health()
        self.test_user_registration()
        self.test_user_validation()
        self.test_user_profile_operations()
        self.test_user_sessions()
        self.test_game_scores()
        self.test_friend_system()
        self.test_call_system()
        self.test_presence_system()
        self.test_search_functionality()
        self.test_system_endpoints()
        self.test_health_endpoints()
        self.test_error_handling()
        self.cleanup_test_data()

        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.passed_tests + self.failed_tests}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.failed_tests}")
        
        if self.failed_tests > 0:
            print(f"\n🔍 Failed Tests:")
            for result in self.test_results:
                if result['status'] == 'FAIL':
                    print(f"   - {result['test']}: {result['details']}")
        
        success_rate = (self.passed_tests / (self.passed_tests + self.failed_tests)) * 100
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 Excellent! API is working well.")
        elif success_rate >= 70:
            print("⚠️ Good, but some issues need attention.")
        else:
            print("🚨 Many tests failed. API needs significant work.")

    def save_results(self, filename: str = None):
        """Save test results to JSON file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"api_test_results_{timestamp}.json"
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "base_url": self.base_url,
            "summary": {
                "total_tests": self.passed_tests + self.failed_tests,
                "passed": self.passed_tests,
                "failed": self.failed_tests,
                "success_rate": (self.passed_tests / (self.passed_tests + self.failed_tests)) * 100
            },
            "test_results": self.test_results,
            "test_data": self.test_data
        }
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📄 Results saved to: {filename}")


def main():
    """Main function to run the tests"""
    import argparse
    
    parser = argparse.ArgumentParser(description='SmartTV API Test Suite')
    parser.add_argument('--url', default='http://20.244.19.161:3001', 
                       help='Base URL of the SmartTV server')
    parser.add_argument('--save', action='store_true', 
                       help='Save test results to JSON file')
    parser.add_argument('--output', type=str, 
                       help='Output filename for results')
    
    args = parser.parse_args()
    
    # Create and run tester
    tester = SmartTVAPITester(args.url)
    
    try:
        tester.run_all_tests()
        
        if args.save:
            tester.save_results(args.output)
            
        # Exit with appropriate code
        sys.exit(0 if tester.failed_tests == 0 else 1)
        
    except KeyboardInterrupt:
        print("\n\n⚠️ Tests interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n\n❌ Test suite failed with error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
