-- Migration script for your actual database schema
-- Run this in your Supabase SQL Editor

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

-- Update existing users to have proper reset dates and question limits
UPDATE users 
SET questions_reset_date = CURRENT_DATE + INTERVAL '1 month'
WHERE questions_reset_date IS NULL;

-- Ensure all users have the correct questionsLeft based on their tier
UPDATE users 
SET "questionsLeft" = get_question_limit(tier)
WHERE "questionsLeft" IS NULL OR "questionsLeft" = 0;

-- Create the reset_monthly_questions function
CREATE OR REPLACE FUNCTION reset_monthly_questions()
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET "questionsLeft" = get_question_limit(tier),
      questions_reset_date = questions_reset_date + INTERVAL '1 month'
  WHERE questions_reset_date <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
