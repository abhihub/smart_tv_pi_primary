-- Updated SmartTV Database Schema
-- SQLite database with userid as primary key (app-generated)

-- Users table with userid as primary key
CREATE TABLE IF NOT EXISTS users_new (
    userid TEXT PRIMARY KEY NOT NULL,  -- App-generated user ID
    username TEXT UNIQUE NOT NULL,     -- 5-char display username
    display_name TEXT,
    device_type TEXT DEFAULT 'smarttv',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    metadata TEXT DEFAULT '{}' -- JSON field for additional device info
);

-- User sessions for tracking active connections
CREATE TABLE IF NOT EXISTS user_sessions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid TEXT NOT NULL,  -- Changed from user_id to userid
    session_token TEXT UNIQUE NOT NULL,
    room_name TEXT,
    session_type TEXT DEFAULT 'video_call',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (userid) REFERENCES users (userid) ON DELETE CASCADE
);

-- Game scores for trivia and other games
CREATE TABLE IF NOT EXISTS game_scores_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid TEXT NOT NULL,  -- Changed from user_id to userid
    game_type TEXT NOT NULL DEFAULT 'trivia',
    score INTEGER DEFAULT 0,
    questions_answered INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    game_duration INTEGER DEFAULT 0,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    room_name TEXT,
    FOREIGN KEY (userid) REFERENCES users (userid) ON DELETE CASCADE
);

-- Friends table for managing user friendships
CREATE TABLE IF NOT EXISTS friends_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid TEXT NOT NULL,        -- Changed from user_id to userid
    friend_userid TEXT NOT NULL, -- Changed from friend_id to friend_userid
    status TEXT DEFAULT 'accepted',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users (userid) ON DELETE CASCADE,
    FOREIGN KEY (friend_userid) REFERENCES users (userid) ON DELETE CASCADE,
    UNIQUE(userid, friend_userid)
);

-- Friend requests table for managing pending friend requests
CREATE TABLE IF NOT EXISTS friend_requests_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_userid TEXT NOT NULL,   -- Changed from sender_id to sender_userid
    receiver_userid TEXT NOT NULL, -- Changed from receiver_id to receiver_userid
    status TEXT DEFAULT 'pending',
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME,
    FOREIGN KEY (sender_userid) REFERENCES users (userid) ON DELETE CASCADE,
    FOREIGN KEY (receiver_userid) REFERENCES users (userid) ON DELETE CASCADE,
    UNIQUE(sender_userid, receiver_userid)
);

-- Enhanced calls table
CREATE TABLE IF NOT EXISTS calls_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT UNIQUE NOT NULL,
    room_name TEXT UNIQUE,
    creator_userid TEXT NOT NULL,  -- Changed from creator_id to creator_userid
    call_type TEXT DEFAULT 'video',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    duration INTEGER DEFAULT 0,
    max_participants INTEGER DEFAULT 10,
    is_rejoinable BOOLEAN DEFAULT 1,
    meeting_title TEXT,
    FOREIGN KEY (creator_userid) REFERENCES users (userid) ON DELETE CASCADE
);

-- Call participants table
CREATE TABLE IF NOT EXISTS call_participants_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT NOT NULL,
    userid TEXT NOT NULL,  -- Changed from user_id to userid
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    left_at DATETIME,
    duration INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    rejoin_count INTEGER DEFAULT 0,
    FOREIGN KEY (call_id) REFERENCES calls (call_id) ON DELETE CASCADE,
    FOREIGN KEY (userid) REFERENCES users (userid) ON DELETE CASCADE
);

-- Call invitations table
CREATE TABLE IF NOT EXISTS call_invitations_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT NOT NULL,
    inviter_userid TEXT NOT NULL,  -- Changed from inviter_id to inviter_userid
    invitee_userid TEXT NOT NULL,  -- Changed from invitee_id to invitee_userid
    status TEXT DEFAULT 'pending',
    invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME,
    FOREIGN KEY (call_id) REFERENCES calls (call_id) ON DELETE CASCADE,
    FOREIGN KEY (inviter_userid) REFERENCES users (userid) ON DELETE CASCADE,
    FOREIGN KEY (invitee_userid) REFERENCES users (userid) ON DELETE CASCADE
);

-- User presence tracking
CREATE TABLE IF NOT EXISTS user_presence_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid TEXT UNIQUE NOT NULL,  -- Changed from user_id to userid
    status TEXT DEFAULT 'offline',
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    socket_id TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users (userid) ON DELETE CASCADE
);

-- Updated call history view
CREATE VIEW IF NOT EXISTS call_history_new AS
SELECT 
    c.id,
    c.call_id,
    c.room_name,
    c.creator_userid,
    creator.username as creator_username,
    creator.display_name as creator_display_name,
    c.call_type,
    c.status,
    c.created_at,
    c.ended_at,
    c.meeting_title,
    c.is_rejoinable,
    c.duration,
    COUNT(DISTINCT cp.userid) as total_participants
FROM calls_new c
LEFT JOIN users_new creator ON c.creator_userid = creator.userid
LEFT JOIN call_participants_new cp ON c.call_id = cp.call_id
GROUP BY c.id, c.call_id, c.room_name, c.creator_userid, creator.username, 
         creator.display_name, c.call_type, c.status, c.created_at, 
         c.ended_at, c.meeting_title, c.is_rejoinable, c.duration;

-- Updated friends view
CREATE VIEW IF NOT EXISTS user_friends_new AS
SELECT 
    f.userid,
    f.friend_userid,
    u.username as friend_username,
    u.display_name as friend_display_name,
    u.device_type as friend_device_type,
    up.status as friend_status,
    up.last_seen as friend_last_seen,
    f.created_at as friendship_created_at
FROM friends_new f
JOIN users_new u ON f.friend_userid = u.userid
LEFT JOIN user_presence_new up ON f.friend_userid = up.userid
WHERE f.status = 'accepted'
ORDER BY up.status DESC, up.last_seen DESC;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_userid ON users_new(userid);
CREATE INDEX IF NOT EXISTS idx_users_username ON users_new(username);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users_new(last_seen);
CREATE INDEX IF NOT EXISTS idx_sessions_userid ON user_sessions_new(userid);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions_new(is_active);
CREATE INDEX IF NOT EXISTS idx_game_scores_userid ON game_scores_new(userid);
CREATE INDEX IF NOT EXISTS idx_game_scores_played_at ON game_scores_new(played_at);
CREATE INDEX IF NOT EXISTS idx_calls_creator_userid ON calls_new(creator_userid);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls_new(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls_new(created_at);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls_new(call_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_userid ON user_presence_new(userid);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence_new(status);
CREATE INDEX IF NOT EXISTS idx_friends_userid ON friends_new(userid);
CREATE INDEX IF NOT EXISTS idx_friends_friend_userid ON friends_new(friend_userid);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_userid ON friend_requests_new(sender_userid);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_userid ON friend_requests_new(receiver_userid);
CREATE INDEX IF NOT EXISTS idx_call_participants_call_id ON call_participants_new(call_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_userid ON call_participants_new(userid);
CREATE INDEX IF NOT EXISTS idx_call_invitations_call_id ON call_invitations_new(call_id);
CREATE INDEX IF NOT EXISTS idx_call_invitations_invitee_userid ON call_invitations_new(invitee_userid);