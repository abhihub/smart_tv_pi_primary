# SmartTV Complete Calling System Deployment Guide

## Overview
This guide covers deploying the complete user-to-user calling system to your Digital Ocean server at 167.71.0.87:3001.

## Prerequisites
- Existing Flask server running on Digital Ocean
- SSH access to the server
- Existing .env file with Twilio credentials

## Files to Deploy

### Complete Server Structure
```
server_side/
├── app.py                    # Updated Flask app with all routes
├── requirements.txt          # Updated dependencies
├── .env.example             # Environment template
├── database/
│   ├── database.py          # Database manager
│   ├── schema.sql           # Complete database schema
│   └── smarttv.db          # SQLite database (auto-created)
├── services/
│   ├── user_service.py      # User management service
│   ├── call_service.py      # Call management service  
│   └── twilio_service.py    # Updated Twilio service
└── api/
    ├── user_routes.py       # User API endpoints
    ├── call_routes.py       # Call API endpoints
    └── twilio_routes.py     # Updated Twilio endpoints
```

## Deployment Steps

### 1. Upload Files to Server
```bash
# From your local SmartTV/server_side directory:
cd server_side

# Create backup of existing server
ssh root@167.71.0.87 "cd /root && cp -r server_side server_side_backup_$(date +%Y%m%d_%H%M%S)"

# Upload complete server structure
scp -r database/ root@167.71.0.87:/root/server_side/
scp -r services/ root@167.71.0.87:/root/server_side/
scp -r api/ root@167.71.0.87:/root/server_side/
scp app.py requirements.txt .env.example root@167.71.0.87:/root/server_side/
```

### 2. SSH into Server and Deploy
```bash
ssh root@167.71.0.87

# Navigate to server directory
cd /root/server_side

# Install dependencies (flask-cors is new)
pip install -r requirements.txt

# Verify environment file exists
ls -la .env

# Initialize database (will auto-create if needed)
python -c "from database.database import db_manager; print('Database initialized')"

# Test the application
python app.py &
sleep 3

# Test endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/calls/health

# Stop test and restart properly
pkill -f "python app.py"

# Restart the service (adjust based on your setup)
# Option 1: If using systemd
sudo systemctl restart smarttv-backend

# Option 2: If using pm2
pm2 restart smarttv-backend

# Option 3: If running directly with nohup
nohup python app.py > server.log 2>&1 &
```

### 3. Verify Deployment
```bash
# Test health endpoints
curl http://167.71.0.87:3001/api/health
curl http://167.71.0.87:3001/api/users/health  
curl http://167.71.0.87:3001/api/calls/health

# Test user registration
curl -X POST http://167.71.0.87:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username": "TEST1", "device_type": "desktop"}'

# Test online users
curl http://167.71.0.87:3001/api/calls/online-users

# Test call creation
curl -X POST http://167.71.0.87:3001/api/calls/invite \
  -H "Content-Type: application/json" \
  -d '{"caller": "TEST1", "callee": "TEST2"}'
```

## Database Auto-Initialization
- SQLite database auto-created at `server_side/database/smarttv.db`
- Complete schema with users, calls, user_presence, user_sessions tables
- No manual database setup required

## Complete API Endpoints Available

### User Management
- `POST /api/users/register` - User registration
- `GET /api/users/profile/{username}` - User profile
- `POST /api/users/session/start` - Start session
- `POST /api/users/session/end` - End session
- `GET /api/users/active` - Active users  
- `GET /api/users/health` - Health check

### Call Management  
- `POST /api/calls/invite` - Initiate call
- `POST /api/calls/answer` - Answer call
- `POST /api/calls/decline` - Decline call
- `POST /api/calls/cancel` - Cancel call
- `POST /api/calls/end` - End call
- `GET /api/calls/status/{call_id}` - Call status
- `GET /api/calls/pending/{username}` - Pending calls
- `GET /api/calls/online-users` - Online users
- `POST /api/calls/presence` - Update presence
- `POST /api/calls/cleanup` - Cleanup old calls
- `GET /api/calls/health` - Health check

### Twilio Integration
- `POST /api/token` - Get Twilio token
- `GET /api/health` - Twilio health check

## Frontend Compatibility
Your existing Electron app will automatically:
- Register users on startup
- Track video call sessions
- Save trivia game scores
- Work seamlessly with the new backend

## Rollback Plan
If issues occur, you can quickly rollback by:
1. Replacing `app.py` and `api/twilio_routes.py` with previous versions
2. Restarting the server
3. The old functionality will work exactly as before

## Monitoring
- Check logs for any database initialization messages
- Monitor `/api/users/health` endpoint for user service status
- Existing Twilio functionality remains unchanged