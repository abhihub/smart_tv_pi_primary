-- Migration Script: Replace auto-increment id with app-generated userid
-- This script migrates the existing database to use userid as primary key

-- STEP 1: Create new tables with userid structure
-- (Tables are defined in schema_updated.sql)

-- STEP 2: Data migration script (if you have existing data)
-- You can run this after creating the new tables

-- Migrate users data (you'll need to generate userids for existing users)
-- INSERT INTO users_new (userid, username, display_name, device_type, created_at, last_seen, is_active, metadata)
-- SELECT 
--     'USR' || printf('%06d', id) as userid,  -- Generate userid from existing id
--     username, display_name, device_type, created_at, last_seen, is_active, metadata
-- FROM users;

-- Migrate user_sessions data
-- INSERT INTO user_sessions_new (userid, session_token, room_name, session_type, started_at, ended_at, is_active)
-- SELECT 
--     'USR' || printf('%06d', user_id) as userid,
--     session_token, room_name, session_type, started_at, ended_at, is_active
-- FROM user_sessions us
-- JOIN users u ON us.user_id = u.id;

-- Migrate game_scores data  
-- INSERT INTO game_scores_new (userid, game_type, score, questions_answered, correct_answers, game_duration, played_at, room_name)
-- SELECT 
--     'USR' || printf('%06d', user_id) as userid,
--     game_type, score, questions_answered, correct_answers, game_duration, played_at, room_name
-- FROM game_scores gs
-- JOIN users u ON gs.user_id = u.id;

-- Migrate friends data
-- INSERT INTO friends_new (userid, friend_userid, status, created_at, updated_at)
-- SELECT 
--     'USR' || printf('%06d', f.user_id) as userid,
--     'USR' || printf('%06d', f.friend_id) as friend_userid,
--     status, created_at, updated_at
-- FROM friends f
-- JOIN users u1 ON f.user_id = u1.id
-- JOIN users u2 ON f.friend_id = u2.id;

-- Migrate friend_requests data
-- INSERT INTO friend_requests_new (sender_userid, receiver_userid, status, message, created_at, responded_at)
-- SELECT 
--     'USR' || printf('%06d', fr.sender_id) as sender_userid,
--     'USR' || printf('%06d', fr.receiver_id) as receiver_userid,
--     status, message, created_at, responded_at
-- FROM friend_requests fr
-- JOIN users u1 ON fr.sender_id = u1.id
-- JOIN users u2 ON fr.receiver_id = u2.id;

-- Migrate calls data
-- INSERT INTO calls_new (call_id, room_name, creator_userid, call_type, status, created_at, ended_at, duration, max_participants, is_rejoinable, meeting_title)
-- SELECT 
--     call_id, room_name,
--     'USR' || printf('%06d', creator_id) as creator_userid,
--     call_type, status, created_at, ended_at, duration, max_participants, is_rejoinable, meeting_title
-- FROM calls c
-- JOIN users u ON c.creator_id = u.id;

-- Migrate call_participants data
-- INSERT INTO call_participants_new (call_id, userid, joined_at, left_at, duration, status, rejoin_count)
-- SELECT 
--     call_id,
--     'USR' || printf('%06d', user_id) as userid,
--     joined_at, left_at, duration, status, rejoin_count
-- FROM call_participants cp
-- JOIN users u ON cp.user_id = u.id;

-- Migrate call_invitations data
-- INSERT INTO call_invitations_new (call_id, inviter_userid, invitee_userid, status, invited_at, responded_at)
-- SELECT 
--     call_id,
--     'USR' || printf('%06d', ci.inviter_id) as inviter_userid,
--     'USR' || printf('%06d', ci.invitee_id) as invitee_userid,
--     status, invited_at, responded_at
-- FROM call_invitations ci
-- JOIN users u1 ON ci.inviter_id = u1.id
-- JOIN users u2 ON ci.invitee_id = u2.id;

-- Migrate user_presence data
-- INSERT INTO user_presence_new (userid, status, last_seen, socket_id, updated_at)
-- SELECT 
--     'USR' || printf('%06d', user_id) as userid,
--     status, last_seen, socket_id, updated_at
-- FROM user_presence up
-- JOIN users u ON up.user_id = u.id;

-- STEP 3: Replace old tables with new ones (uncomment when ready)
-- DROP TABLE IF EXISTS users;
-- DROP TABLE IF EXISTS user_sessions;
-- DROP TABLE IF EXISTS game_scores;
-- DROP TABLE IF EXISTS friends;
-- DROP TABLE IF EXISTS friend_requests;
-- DROP TABLE IF EXISTS calls;
-- DROP TABLE IF EXISTS call_participants;
-- DROP TABLE IF EXISTS call_invitations;
-- DROP TABLE IF EXISTS user_presence;
-- DROP VIEW IF EXISTS call_history;
-- DROP VIEW IF EXISTS user_friends;

-- ALTER TABLE users_new RENAME TO users;
-- ALTER TABLE user_sessions_new RENAME TO user_sessions;
-- ALTER TABLE game_scores_new RENAME TO game_scores;
-- ALTER TABLE friends_new RENAME TO friends;
-- ALTER TABLE friend_requests_new RENAME TO friend_requests;
-- ALTER TABLE calls_new RENAME TO calls;
-- ALTER TABLE call_participants_new RENAME TO call_participants;
-- ALTER TABLE call_invitations_new RENAME TO call_invitations;
-- ALTER TABLE user_presence_new RENAME TO user_presence;

-- CREATE VIEW call_history AS SELECT * FROM call_history_new;
-- CREATE VIEW user_friends AS SELECT * FROM user_friends_new;
-- DROP VIEW call_history_new;
-- DROP VIEW user_friends_new;