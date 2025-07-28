-- SmartTV Database Schema
-- SQLite database for user management and device tracking

-- Users table for storing unique device identities
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    device_type TEXT DEFAULT 'smarttv',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    metadata TEXT DEFAULT '{}' -- JSON field for additional device info
);

-- User sessions for tracking active connections
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    room_name TEXT,
    session_type TEXT DEFAULT 'video_call', -- 'video_call', 'trivia_game', etc.
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Game scores for trivia and other games
CREATE TABLE IF NOT EXISTS game_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game_type TEXT NOT NULL DEFAULT 'trivia',
    score INTEGER DEFAULT 0,
    questions_answered INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    game_duration INTEGER DEFAULT 0, -- seconds
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    room_name TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Call invitations for user-to-user calling
CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caller_id INTEGER NOT NULL,
    callee_id INTEGER NOT NULL,
    call_id TEXT UNIQUE NOT NULL, -- Unique identifier for the call
    room_name TEXT, -- Twilio room name if call is accepted
    status TEXT DEFAULT 'pending', -- 'pending', 'ringing', 'accepted', 'declined', 'cancelled', 'ended', 'missed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    answered_at DATETIME,
    ended_at DATETIME,
    duration INTEGER DEFAULT 0, -- Call duration in seconds
    FOREIGN KEY (caller_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (callee_id) REFERENCES users (id) ON DELETE CASCADE
);

-- User presence tracking for online/offline status
CREATE TABLE IF NOT EXISTS user_presence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    status TEXT DEFAULT 'offline', -- 'online', 'offline', 'busy', 'away'
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    socket_id TEXT, -- WebSocket connection ID
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- User contacts/connections for managing contact lists
CREATE TABLE IF NOT EXISTS user_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL, -- The user who owns this contact list
    contact_user_id INTEGER NOT NULL, -- The user being added to the contact list
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_favorite BOOLEAN DEFAULT 0, -- Optional: mark favorite contacts
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (contact_user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(user_id, contact_user_id) -- Prevent duplicate contacts
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_game_scores_user_id ON game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_played_at ON game_scores(played_at);
CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_callee_id ON calls(callee_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_contacts_user_id ON user_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_contact_user_id ON user_contacts(contact_user_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_added_at ON user_contacts(added_at);