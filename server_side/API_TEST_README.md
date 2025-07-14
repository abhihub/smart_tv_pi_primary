# SmartTV API Test Suite

Comprehensive testing script for all SmartTV database API endpoints and functionality.

## Overview

The `test_api.py` script tests all API endpoints in the SmartTV server including:

- **User Management**: Registration, profiles, sessions
- **Friend System**: Friend requests, acceptance, blocking
- **Call System**: Creating, joining, leaving calls
- **Game Scores**: Saving and retrieving game data
- **Presence System**: Online/offline status tracking
- **System Operations**: Health checks, error handling
- **Input Validation**: Testing edge cases and error conditions

## Usage

### Basic Usage

```bash
# Test server running on default port (3001)
python3 test_api.py

# Test server on different URL
python3 test_api.py --url http://192.168.1.100:3001
```

### Save Results

```bash
# Save results to JSON file with timestamp
python3 test_api.py --save

# Save results to specific file
python3 test_api.py --save --output my_test_results.json
```

### Prerequisites

Make sure your SmartTV server is running:

```bash
# Start the server first
python3 app.py
```

Required Python packages:
- `requests`
- `json` (built-in)
- `uuid` (built-in)
- `datetime` (built-in)

Install requests if needed:
```bash
pip install requests
```

## Test Categories

### 🔍 Server Health
- Root endpoint functionality
- Health check endpoint

### 👤 User Management
- User registration with validation
- Profile retrieval and updates
- Session management
- Input validation (userid, username format)

### 🎮 Game System
- Save game scores
- Retrieve user statistics

### 👥 Friend System
- Send/accept/decline friend requests
- Block/unblock users
- Get friends lists
- Pending requests tracking

### 📞 Call System
- Create and join calls
- Call status tracking
- Leave and end calls
- Call invitations
- Online user tracking

### 🟢 Presence System
- Update user online status
- Track active users
- Socket ID management

### 🔍 Search
- User search functionality
- Query validation

### ⚙️ System Management
- Shutdown/reboot endpoints (safety tested)
- Service health checks

### ⚠️ Error Handling
- Malformed JSON handling
- Non-existent endpoints
- Invalid HTTP methods
- Input validation

## Output

The script provides:
- ✅ Real-time test results with pass/fail status
- 📊 Summary with success rate
- 📄 Optional JSON export of detailed results
- 🔍 Failed test details for debugging

## Example Output

```
🚀 Starting SmartTV API Test Suite
Testing server at: http://localhost:3001
============================================================

🔍 Testing Server Health...
✅ Server Root Endpoint: PASS
✅ Server Health Endpoint: PASS

👤 Testing User Registration...
✅ User Registration 1: PASS
✅ User Registration 2: PASS
✅ Duplicate User Registration: PASS

... (continued for all tests)

============================================================
📊 TEST SUMMARY
============================================================
Total Tests: 45
✅ Passed: 43
❌ Failed: 2
📈 Success Rate: 95.6%
🎉 Excellent! API is working well.
```

## Test Data

The script automatically generates:
- Random test usernames (5 alphanumeric characters)
- Unique user IDs
- Test call rooms
- Game score data
- Session tokens

All test data is cleaned up after testing when possible.

## Error Codes

- Exit code 0: All tests passed
- Exit code 1: Some tests failed
- Exit code 130: Tests interrupted by user

## Customization

You can modify the test script to:
- Add new test cases
- Change test data generation
- Modify validation criteria
- Add custom endpoints
- Adjust timeout values

## Troubleshooting

**Connection Refused**: Make sure the SmartTV server is running on the specified URL.

**Permission Denied**: Ensure the script has execute permissions.

**Import Errors**: Install required packages with `pip install requests`.

**Database Errors**: Check that the database is properly initialized and accessible.