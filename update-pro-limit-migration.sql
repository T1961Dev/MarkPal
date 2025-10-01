-- Migration script to update Pro plan from 100 to 50 questions
-- Run this in your Supabase SQL Editor

-- Update the get_question_limit function to change Pro from 100 to 50
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

-- Update existing Pro users to have 50 questions instead of 100
UPDATE users 
SET "questionsLeft" = LEAST("questionsLeft", 50)
WHERE tier = 'pro' AND "questionsLeft" > 50;
