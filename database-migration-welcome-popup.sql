-- Migration: Add has_seen_welcome column to users table
-- This tracks whether a user has seen the welcome popup on first login

-- Add the has_seen_welcome column with default value false
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN DEFAULT false;

-- Update existing users to have seen the welcome popup (so they don't see it again)
UPDATE users 
SET has_seen_welcome = true 
WHERE has_seen_welcome IS NULL;

-- Make the column NOT NULL with default false
ALTER TABLE users 
ALTER COLUMN has_seen_welcome SET NOT NULL;

-- Add a comment to document the purpose
COMMENT ON COLUMN users.has_seen_welcome IS 'Tracks whether user has seen the welcome popup on first login';
