-- Migration: Add UNIQUE constraint to call_invitations table
-- This fixes the "ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint" error

-- Step 1: Create new table with the constraint
CREATE TABLE IF NOT EXISTS call_invitations_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT NOT NULL,
    inviter_userid TEXT NOT NULL,
    invitee_userid TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME,
    FOREIGN KEY (call_id) REFERENCES calls (call_id) ON DELETE CASCADE,
    FOREIGN KEY (inviter_userid) REFERENCES users (userid) ON DELETE CASCADE,
    FOREIGN KEY (invitee_userid) REFERENCES users (userid) ON DELETE CASCADE,
    UNIQUE(call_id, inviter_userid, invitee_userid)
);

-- Step 2: Copy data from old table, removing duplicates
INSERT INTO call_invitations_new (id, call_id, inviter_userid, invitee_userid, status, invited_at, responded_at)
SELECT 
    MIN(id) as id,  -- Keep the earliest invitation if duplicates exist
    call_id,
    inviter_userid,
    invitee_userid,
    status,
    MIN(invited_at) as invited_at,  -- Keep earliest invite time
    responded_at
FROM call_invitations
GROUP BY call_id, inviter_userid, invitee_userid;

-- Step 3: Drop old table and rename new one
DROP TABLE call_invitations;
ALTER TABLE call_invitations_new RENAME TO call_invitations;

-- Step 4: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_call_invitations_call_id ON call_invitations(call_id);
CREATE INDEX IF NOT EXISTS idx_call_invitations_invitee_userid ON call_invitations(invitee_userid);