# SmartTV User Management Deployment Guide

## Overview
This guide covers deploying the new user management features to your existing Digital Ocean server at 157.245.74.59.

## Prerequisites
- Existing Flask server running on Digital Ocean
- SSH access to the server
- Existing .env file with Twilio credentials

## Files to Upload

### New Files
```
server_side/
├── database/
│   ├── database.py
│   └── schema.sql
├── services/
│   └── user_service.py
└── api/
    └── user_routes.py
```

### Updated Files
```
server_side/
├── app.py (updated to register user routes)
├── api/twilio_routes.py (updated with user tracking)
└── requirements.txt (no new dependencies)
```

## Deployment Steps

### 1. Upload Files to Server
```bash
# Copy new and updated files to your server
scp -r database/ user@157.245.74.59:/path/to/your/server_side/
scp services/user_service.py user@157.245.74.59:/path/to/your/server_side/services/
scp api/user_routes.py user@157.245.74.59:/path/to/your/server_side/api/
scp app.py user@157.245.74.59:/path/to/your/server_side/
scp api/twilio_routes.py user@157.245.74.59:/path/to/your/server_side/api/
```

### 2. SSH into Server and Restart
```bash
ssh user@157.245.74.59

# Navigate to your server directory
cd /path/to/your/server_side

# Install any missing dependencies (should already be installed)
pip install -r requirements.txt

# Restart your Flask application
# If using systemd:
sudo systemctl restart smarttv-backend

# If using pm2:
pm2 restart smarttv-backend

# If running directly:
python app.py
```

### 3. Verify Deployment
```bash
# Test the new user endpoints
curl http://157.245.74.59:3001/api/users/health

# Test existing Twilio endpoint still works
curl http://157.245.74.59:3001/api/health
```

## Database Auto-Initialization
- The SQLite database will be automatically created at `server_side/database/smarttv.db`
- No manual database setup required
- Database will initialize on first API call

## New API Endpoints Available
- `POST /api/users/register` - User registration
- `GET /api/users/profile/{username}` - User profile
- `POST /api/users/session/start` - Start session
- `POST /api/users/session/end` - End session
- `POST /api/users/game/score` - Save game scores
- `GET /api/users/active` - Active users
- `GET /api/users/health` - Health check

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