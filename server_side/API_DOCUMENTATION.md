# SmartTV Server API Documentation

## Overview
The SmartTV Server provides a comprehensive API for managing users, calls, Twilio integration, and system operations for smart TV video calling applications.

**Base URL:** `http://localhost:3001`  
**API Version:** 1.0  
**Content-Type:** `application/json`

## Core Endpoints

### Health & Status
- `GET /` - Server status check
- `GET /health` - Health check endpoint

---

## User Management API (`/api/users`)

### User Registration & Profile

#### Register/Update User
**POST** `/api/users/register`

Register a new user or update existing user information.

**Request Body:**
```json
{
  "username": "ABC123",
  "display_name": "John Doe",
  "device_type": "smarttv",
  "metadata": {
    "device_model": "Samsung TV",
    "app_version": "1.0.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "username": "ABC123",
    "display_name": "John Doe",
    "device_type": "smarttv",
    "created_at": "2024-01-01T12:00:00Z"
  }
}
```

#### Get User Profile
**GET** `/api/users/profile/{username}`

Retrieve user profile and statistics.

**Response:**
```json
{
  "success": true,
  "user": {
    "username": "ABC123",
    "display_name": "John Doe",
    "last_seen": "2024-01-01T12:00:00Z",
    "total_sessions": 15,
    "total_call_time": 3600
  }
}
```

#### Update User Profile
**PUT** `/api/users/profile/{username}`

Update user profile information.

**Request Body:**
```json
{
  "display_name": "New Display Name",
  "metadata": {
    "device_model": "Updated model"
  }
}
```

### Session Management

#### Start Session
**POST** `/api/users/session/start`

Start a new user session.

**Request Body:**
```json
{
  "username": "ABC123",
  "session_type": "video_call",
  "room_name": "family-room"
}
```

**Response:**
```json
{
  "success": true,
  "session_token": "ABC123_1234567890",
  "username": "ABC123",
  "session_type": "video_call",
  "room_name": "family-room"
}
```

#### End Session
**POST** `/api/users/session/end`

End a user session.

**Request Body:**
```json
{
  "session_token": "ABC123_1234567890"
}
```

### Game Scores

#### Save Game Score
**POST** `/api/users/game/score`

Save game score for a user.

**Request Body:**
```json
{
  "username": "ABC123",
  "game_type": "trivia",
  "score": 85,
  "questions_answered": 10,
  "correct_answers": 8,
  "game_duration": 300,
  "room_name": "family-room"
}
```

### Friends Management

#### Send Friend Request
**POST** `/api/users/friends/request`

Send a friend request to another user.

**Request Body:**
```json
{
  "sender": "CYJXC",
  "receiver": "AJ84H",
  "message": "Let's be friends!"
}
```

#### Accept Friend Request
**POST** `/api/users/friends/accept`

Accept a friend request.

**Request Body:**
```json
{
  "sender": "CYJXC",
  "receiver": "AJ84H"
}
```

#### Decline Friend Request
**POST** `/api/users/friends/decline`

Decline a friend request.

**Request Body:**
```json
{
  "sender": "CYJXC",
  "receiver": "AJ84H"
}
```

#### Remove Friend
**POST** `/api/users/friends/remove`

Remove a friend from friends list.

**Request Body:**
```json
{
  "username1": "CYJXC",
  "username2": "AJ84H"
}
```

#### Block User
**POST** `/api/users/friends/block`

Block a user.

**Request Body:**
```json
{
  "username": "CYJXC",
  "blocked_username": "AJ84H"
}
```

#### Unblock User
**POST** `/api/users/friends/unblock`

Unblock a user.

**Request Body:**
```json
{
  "username": "CYJXC",
  "blocked_username": "AJ84H"
}
```

### User Queries

#### Get Active Users
**GET** `/api/users/active?limit=50`

Get list of recently active users.

#### Get Friends List
**GET** `/api/users/friends/{username}`

Get user's friends list.

#### Get Pending Friend Requests
**GET** `/api/users/friends/requests/pending/{username}`

Get pending friend requests for a user.

#### Get Sent Friend Requests
**GET** `/api/users/friends/requests/sent/{username}`

Get sent friend requests for a user.

#### Get Blocked Users
**GET** `/api/users/friends/blocked/{username}`

Get list of blocked users.

#### Search Users
**GET** `/api/users/search?q=query&current_user=ABC123&limit=20`

Search for users by username or display name.

#### User Service Health
**GET** `/api/users/health`

Health check for user service.

---

## Call Management API (`/api/calls`)

### Call Operations

#### Get Online Users
**GET** `/api/calls/online-users?exclude_user=ABC123`

Get list of users currently online.

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "username": "XYZ789",
      "display_name": "Jane Doe",
      "status": "online"
    }
  ],
  "count": 1
}
```

#### Initiate Call
**POST** `/api/calls/invite`

Initiate a call to another user.

**Request Body:**
```json
{
  "caller": "CYJXC",
  "callee": "AJ84H"
}
```

**Response:**
```json
{
  "success": true,
  "call": {
    "call_id": "uuid-string",
    "caller": "CYJXC",
    "callee": "AJ84H",
    "status": "pending",
    "created_at": "2024-01-01T12:00:00Z"
  }
}
```

#### Answer Call
**POST** `/api/calls/answer`

Answer an incoming call.

**Request Body:**
```json
{
  "call_id": "uuid-string",
  "callee": "AJ84H"
}
```

#### Decline Call
**POST** `/api/calls/decline`

Decline an incoming call.

**Request Body:**
```json
{
  "call_id": "uuid-string",
  "callee": "AJ84H"
}
```

#### Cancel Call
**POST** `/api/calls/cancel`

Cancel an outgoing call.

**Request Body:**
```json
{
  "call_id": "uuid-string",
  "caller": "CYJXC"
}
```

#### End Call
**POST** `/api/calls/end`

End an active call.

**Request Body:**
```json
{
  "call_id": "uuid-string",
  "username": "CYJXC"
}
```

### Group Calls

#### Create Call Room
**POST** `/api/calls/create`

Create a new call room for group calls.

**Request Body:**
```json
{
  "creator": "CYJXC",
  "call_type": "video",
  "meeting_title": "Team Meeting",
  "max_participants": 10
}
```

#### Join Call
**POST** `/api/calls/join`

Join an existing call.

**Request Body:**
```json
{
  "call_id": "uuid-string",
  "username": "AJ84H"
}
```

#### Leave Call
**POST** `/api/calls/leave`

Leave a call.

**Request Body:**
```json
{
  "call_id": "uuid-string",
  "username": "AJ84H"
}
```

#### Invite to Call
**POST** `/api/calls/invite-user`

Invite a user to join a call.

**Request Body:**
```json
{
  "call_id": "uuid-string",
  "inviter": "CYJXC",
  "invitee": "AJ84H"
}
```

#### Accept Call Invitation
**POST** `/api/calls/accept-invitation`

Accept a call invitation.

**Request Body:**
```json
{
  "call_id": "uuid-string",
  "username": "AJ84H"
}
```

#### Decline Call Invitation
**POST** `/api/calls/decline-invitation`

Decline a call invitation.

**Request Body:**
```json
{
  "call_id": "uuid-string",
  "username": "AJ84H"
}
```

### Call Status & History

#### Get Call Status
**GET** `/api/calls/status/{call_id}`

Get current status of a specific call.

#### Get Pending Calls
**GET** `/api/calls/pending/{username}`

Get pending calls for a specific user.

#### Get Pending Invitations
**GET** `/api/calls/invitations/{username}`

Get pending call invitations for a specific user.

#### Get Active Calls
**GET** `/api/calls/active/{username}`

Get active calls for a specific user.

#### Get Call History
**GET** `/api/calls/history?username=ABC123&limit=50`

Get call history (optionally filtered by user).

### Presence & Cleanup

#### Update Presence
**POST** `/api/calls/presence`

Update user presence status.

**Request Body:**
```json
{
  "username": "CYJXC",
  "status": "online",
  "socket_id": "optional_socket_id"
}
```

#### Cleanup Old Calls
**POST** `/api/calls/cleanup`

Clean up old completed calls (admin endpoint).

**Request Body:**
```json
{
  "hours": 24
}
```

#### Call Service Health
**GET** `/api/calls/health`

Health check for call service.

---

## Twilio Integration API (`/api`)

### Token Management

#### Generate Twilio Token
**POST** `/api/token`

Generate Twilio access token for video calling.

**Request Body:**
```json
{
  "identity": "ABC123",
  "roomName": "room_name"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "session_token": "ABC123_1234567890",
  "identity": "ABC123",
  "roomName": "room_name"
}
```

#### Twilio Health Check
**GET** `/api/health`

Health check endpoint for Twilio service.

**Response:**
```json
{
  "status": "healthy",
  "service": "twilio",
  "configured": true
}
```

---

## System Management API (`/api/system`)

### System Control

#### Shutdown System
**POST** `/api/system/shutdown`

Shutdown the Raspberry Pi system.

**Request Body:**
```json
{
  "confirm": true,
  "delay": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "System shutdown initiated",
  "delay_seconds": 0,
  "command": "sudo shutdown -h now",
  "test_mode": true,
  "timestamp": "2024-01-01 12:00:00"
}
```

#### Reboot System
**POST** `/api/system/reboot`

Reboot the Raspberry Pi system.

**Request Body:**
```json
{
  "confirm": true,
  "delay": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "System reboot initiated",
  "delay_seconds": 0,
  "timestamp": "2024-01-01 12:00:00"
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message describing what went wrong",
  "success": false
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `404` - Not Found (user/call not found)
- `500` - Internal Server Error

---

## Authentication & Security

- Currently no authentication required
- All endpoints accept JSON requests
- Username validation: 5 alphanumeric characters
- System endpoints require confirmation parameter
- CORS enabled for cross-origin requests

---

## Rate Limiting & Performance

- No rate limiting currently implemented
- Database operations are optimized for SQLite
- Session tokens are used for tracking active sessions
- Old data cleanup available for call history

---

## Development & Testing

- Test mode enabled for system shutdown operations
- Comprehensive logging available in `/logs` directory
- Health check endpoints for all services
- Database health monitoring included