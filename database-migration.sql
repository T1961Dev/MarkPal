-- Migration script to update existing database
-- Run this script to add missing columns and update constraints

-- Add questions_reset_date column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS questions_reset_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month');

-- Update the tier constraint to include 'pro+'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tier_check;
ALTER TABLE users ADD CONSTRAINT users_tier_check CHECK (tier IN ('free', 'basic', 'pro', 'pro+'));

-- Update the get_question_limit function to include 'pro+'
CREATE OR REPLACE FUNCTION get_question_limit(user_tier TEXT)
RETURNS INTEGER AS $$
BEGIN
  CASE user_tier
    WHEN 'free' THEN RETURN 5;
    WHEN 'basic' THEN RETURN 20;
    WHEN 'pro' THEN RETURN 50;
    WHEN 'pro+' THEN RETURN 999999;
    ELSE RETURN 5;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Update existing users to have a proper reset date if they don't have one
UPDATE users 
SET questions_reset_date = CURRENT_DATE + INTERVAL '1 month'
WHERE questions_reset_date IS NULL;

-- Ensure all users have the correct questionsLeft based on their tier
UPDATE users 
SET "questionsLeft" = get_question_limit(tier)
WHERE "questionsLeft" IS NULL OR "questionsLeft" = 0;
