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

-- Friends table for managing user friendships
CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    status TEXT DEFAULT 'accepted', -- 'accepted', 'blocked'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(user_id, friend_id) -- Prevent duplicate friendships
);

-- Friend requests table for managing pending friend requests
CREATE TABLE IF NOT EXISTS friend_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'cancelled'
    message TEXT, -- Optional message with friend request
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME,
    FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(sender_id, receiver_id) -- Prevent duplicate requests
);

-- Enhanced calls table (replaces the existing calls table)
DROP TABLE IF EXISTS calls;
CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT UNIQUE NOT NULL, -- Unique identifier for the call
    room_name TEXT UNIQUE, -- Twilio room name
    creator_id INTEGER NOT NULL, -- User who created the call
    call_type TEXT DEFAULT 'video', -- 'video', 'audio', 'conference'
    status TEXT DEFAULT 'active', -- 'active', 'ended', 'cancelled', 'declined'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    duration INTEGER DEFAULT 0, -- Call duration in seconds (calculated from created_at and ended_at)
    max_participants INTEGER DEFAULT 10, -- Maximum allowed participants
    is_rejoinable BOOLEAN DEFAULT 1, -- Whether users can rejoin after leaving
    meeting_title TEXT, -- Optional meeting title
    FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Call participants table for tracking who joined/left calls
CREATE TABLE IF NOT EXISTS call_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    left_at DATETIME,
    duration INTEGER DEFAULT 0, -- Time spent in call (seconds)
    status TEXT DEFAULT 'active', -- 'active', 'left', 'disconnected', 'kicked'
    rejoin_count INTEGER DEFAULT 0, -- Number of times user rejoined
    FOREIGN KEY (call_id) REFERENCES calls (call_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Call invitations table for managing who was invited to calls
CREATE TABLE IF NOT EXISTS call_invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT NOT NULL,
    inviter_id INTEGER NOT NULL,
    invitee_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'cancelled'
    invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME,
    FOREIGN KEY (call_id) REFERENCES calls (call_id) ON DELETE CASCADE,
    FOREIGN KEY (inviter_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (invitee_id) REFERENCES users (id) ON DELETE CASCADE
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

-- Call history view for easy access to call details with participants
CREATE VIEW IF NOT EXISTS call_history AS
SELECT 
    c.id,
    c.call_id,
    c.room_name,
    c.creator_id,
    creator.username as creator_username,
    creator.display_name as creator_display_name,
    c.call_type,
    c.status,
    c.created_at,
    c.ended_at,
    c.meeting_title,
    c.is_rejoinable,
    c.duration,
    COUNT(DISTINCT cp.user_id) as total_participants
FROM calls c
LEFT JOIN users creator ON c.creator_id = creator.id
LEFT JOIN call_participants cp ON c.call_id = cp.call_id
GROUP BY c.id, c.call_id, c.room_name, c.creator_id, creator.username, 
         creator.display_name, c.call_type, c.status, c.created_at, 
         c.ended_at, c.meeting_title, c.is_rejoinable, c.duration;

-- Friends view for easy access to friends list with user details
CREATE VIEW IF NOT EXISTS user_friends AS
SELECT 
    f.user_id,
    f.friend_id,
    u.username as friend_username,
    u.display_name as friend_display_name,
    u.device_type as friend_device_type,
    up.status as friend_status,
    up.last_seen as friend_last_seen,
    f.created_at as friendship_created_at
FROM friends f
JOIN users u ON f.friend_id = u.id
LEFT JOIN user_presence up ON f.friend_id = up.user_id
WHERE f.status = 'accepted'
ORDER BY up.status DESC, up.last_seen DESC;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_game_scores_user_id ON game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_played_at ON game_scores(played_at);
CREATE INDEX IF NOT EXISTS idx_calls_creator_id ON calls(creator_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_id ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_id ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_call_id ON call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user_id ON call_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_call_invitations_call_id ON call_invitations(call_id);
CREATE INDEX IF NOT EXISTS idx_call_invitations_invitee_id ON call_invitations(invitee_id);