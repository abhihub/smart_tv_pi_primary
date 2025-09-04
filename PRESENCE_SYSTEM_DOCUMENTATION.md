# 📡 **SmartTV User Presence System - Complete Overview**

After analyzing your codebase, here's how the user presence/online status system works in an easy-to-understand format:

## 🗄️ **Database Structure**

### **Core Tables:**
1. **`users`** - Basic user info with `last_seen` timestamp
2. **`user_presence`** - Real-time presence tracking with status and socket IDs
3. **`user_contacts`** - Contact relationships with favorite flags

```sql
-- Key presence fields:
user_presence:
  - status: 'online', 'offline', 'busy', 'away'  
  - last_seen: DATETIME
  - socket_id: WebSocket connection ID
  - updated_at: DATETIME
```

## 🔄 **How Presence Sync Works**

### **Backend APIs (Flask Server)**

**Main Presence Endpoint:**
- **`POST /api/calls/presence`** - Updates user status
  ```json
  {
    "username": "HI20E",
    "status": "online",
    "socket_id": "optional_ws_id"
  }
  ```

**Related Endpoints:**
- **`GET /api/calls/online-users`** - Gets list of online users
- **`POST /api/users/session/start`** - Marks user active, updates `last_seen`
- **`GET /api/users/profile/<username>`** - Auto-updates `last_seen` when called

### **Frontend Presence Management**

**Primary System (`call-monitor.js`):**
```javascript
// Automatic presence updates
updatePresence(status = 'online') {
    // Calls /api/calls/presence endpoint
    // Updates user status in database
}
```

**Trigger Points:**
1. **Page Load** → Sets status to `'online'`
2. **Page Hide/Show** → Switches between `'away'` and `'online'`
3. **Page Unload** → Sets status to `'offline'`
4. **Manual Actions** → Updates `last_seen` timestamp

## ⚙️ **Configuration Settings**

### **Timing Settings:**

| **Setting** | **Location** | **Value** | **Purpose** |
|-------------|--------------|-----------|-------------|
| **Call Check Interval** | `call-monitor.js` | `1000ms` (1 second) | How often to check for incoming calls |
| **Presence Heartbeat** | `call-monitor.js` | `90000ms` (90 seconds) | Automatic presence updates to stay online |
| **Background Cleanup** | `background_service.py` | Every 2 minutes | How often to check for inactive users |
| **Offline Threshold** | `background_service.py` | 3 minutes | Mark users offline after this inactivity |
| **Online Determination** | `call_service.py` | 2 minutes | Consider users online if updated within this time |
| **Call Records Cleanup** | `call_service.py` | 24 hours | Removes old completed call records |

### **Status Values:**
- **`'online'`** - User is actively using the app
- **`'away'`** - User has minimized/hidden the app  
- **`'offline'`** - User closed the app or lost connection
- **`'busy'`** - (Reserved for future use, e.g., in calls)

## 🔄 **Presence Flow Diagram**

```
User Opens App → call-monitor.js starts
        ↓
   Sets status: 'online' → POST /api/calls/presence
        ↓
Every 1 second → Checks for incoming calls
        ↓
Every 90 seconds → Heartbeat: POST /api/calls/presence (stays online)
        ↓
User minimizes → status: 'away'
        ↓  
User maximizes → status: 'online' + restart heartbeat
        ↓
User closes app → status: 'offline'
        ↓
Background Service → Marks inactive users offline after 3 minutes
```

## 🎯 **Key Integration Points**

### **Where Presence is Used:**
1. **User Directory** - Shows online/offline indicators
2. **Contact Lists** - Filters online contacts
3. **Call System** - Only allows calls to online users
4. **Mobile App** - Syncs with TV presence status

### **Frontend Pages Using Presence:**
- **`user-directory.html`** - Displays online status, calls `updatePresence()`
- **`homepage.html`** - Updates presence on load
- **All pages** - Include `call-monitor.js` for automatic presence sync

### **Mobile App Integration:**
- Mobile remote app can check TV online status
- TV presence affects mobile app connectivity indicators
- WebSocket connections include presence updates

## 🔧 **Configuration Locations**

| **Component** | **File** | **What You Can Configure** |
|---------------|----------|----------------------------|
| **Call Check Frequency** | `call-monitor.js:9` | `notificationInterval: 1000` |
| **Presence Heartbeat** | `call-monitor.js:10` | `presenceUpdateInterval: 90000` |
| **Background Cleanup** | `background_service.py:40` | `minutes=2` (cleanup frequency) |
| **Offline Threshold** | `background_service.py:94` | `timedelta(minutes=3)` |
| **Online Buffer Time** | `call_service.py:425` | `<= 120` seconds (2 minutes) |
| **Presence Statuses** | `schema.sql:63` | `status TEXT DEFAULT 'offline'` |

## 💡 **How to Modify Settings**

**To change presence update timing:**
```javascript
// In call-monitor.js constructor
this.notificationInterval = 2000;        // Call checks (default: 1000ms) 
this.presenceUpdateInterval = 120000;    // Heartbeat (default: 90000ms)
```

**To modify background cleanup behavior:**
```python
# In background_service.py
# Change cleanup frequency (line 40)
minutes=5,  # Run cleanup every 5 minutes instead of 2

# Change offline threshold (line 94)  
five_minutes_ago = datetime.now() - timedelta(minutes=5)  # Instead of 3
```

**To adjust online detection logic:**
```python
# In call_service.py _is_user_actually_online() method (line 425)
is_recent = time_diff <= 180  # Change from 120 to 180 seconds (3 minutes)
```

## 🔧 **Recent Improvements & Fixes**

### **Enhanced Presence Stability (Latest Update)**

The system now includes several improvements to prevent false offline status:

#### **1. Smart Presence Detection (`call_service.py:398-433`)**
- Added `_is_user_actually_online()` method
- Considers both presence status AND timestamp freshness  
- Users marked online only if updated within last 2 minutes
- Prevents stale "online" status from showing active users as online

#### **2. Optimized Background Service Timing**
- **Cleanup Frequency**: Changed from 30 seconds to 2 minutes
- **Offline Threshold**: Increased from 1 minute to 3 minutes
- Reduces conflicts between frontend updates and background cleanup

#### **3. Proactive Presence Heartbeat**
- **Frontend Heartbeat**: Automatic presence updates every 90 seconds
- **Smart Timing**: Stays ahead of 3-minute background cleanup threshold
- **Lifecycle Management**: Properly starts/stops with call monitoring

#### **4. Timing Hierarchy for Conflict Prevention**
```
Frontend heartbeat: Every 90 seconds
    ↓ 
Online determination: Within 2 minutes
    ↓
Background cleanup: After 3 minutes inactivity
```

This layered approach ensures users stay online while actively using the app and are marked offline only when truly inactive.

This system provides real-time presence tracking with automatic updates based on user activity, ensuring accurate online/offline status across your SmartTV ecosystem! 🎉

## 📋 **API Reference**

### **Presence Management APIs**

#### Update User Presence
```http
POST /api/calls/presence
Content-Type: application/json

{
  "username": "HI20E",
  "status": "online|offline|away|busy",
  "socket_id": "optional_websocket_id"
}
```

#### Get Online Users
```http
GET /api/calls/online-users?exclude_user=HI20E&contacts_only=false
```

#### Start User Session
```http
POST /api/users/session/start
Content-Type: application/json

{
  "username": "HI20E",
  "session_type": "video_call",
  "room_name": "optional_room"
}
```

### **Database Schema Reference**

#### user_presence table
```sql
CREATE TABLE user_presence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    status TEXT DEFAULT 'offline', -- 'online', 'offline', 'busy', 'away'
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    socket_id TEXT, -- WebSocket connection ID
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

#### users table (presence-related fields)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    -- other fields...
);
```

## 🚨 **Troubleshooting Common Issues**

### **Users Showing as Offline When They're Online** ✅ *Recently Fixed*
- **Fixed**: Enhanced presence detection with timestamp checking
- **Fixed**: Reduced background service cleanup aggression  
- **Fixed**: Added proactive presence heartbeat every 90 seconds
- Check if `call-monitor.js` is loading on all pages
- Verify presence API endpoints are reachable
- Check browser console for JavaScript errors
- Ensure database `user_presence` table exists

### **Presence Updates Not Working**
1. Verify Flask server is running on port 3001
2. Check CORS configuration in Flask app
3. Ensure `updatePresence()` function is being called
4. Check network connectivity between frontend and backend

### **Performance Issues** ✅ *Optimized*
- **Optimized**: Background cleanup now runs every 2 minutes instead of 30 seconds
- **Optimized**: Presence heartbeat efficiently maintains status every 90 seconds  
- Consider increasing `notificationInterval` from 1000ms if needed
- Consider increasing `presenceUpdateInterval` from 90000ms for lower network usage
- Add database indexing on frequently queried presence fields

### **Mobile App Presence Sync Issues**
- Ensure mobile app and TV are on same network
- Check WebSocket connection stability
- Verify mobile app is calling presence APIs correctly
- Review mobile app connection timeout settings