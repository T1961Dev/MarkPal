-- Create saved_questions table
CREATE TABLE IF NOT EXISTS saved_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  question TEXT NOT NULL,
  mark_scheme TEXT NOT NULL,
  student_answer TEXT NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  highlights JSONB NOT NULL DEFAULT '[]',
  analysis JSONB NOT NULL DEFAULT '{}',
  detailed_feedback TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_questions_user_id ON saved_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_questions_created_at ON saved_questions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE saved_questions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own saved questions
CREATE POLICY "Users can view their own saved questions" ON saved_questions
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own saved questions
CREATE POLICY "Users can insert their own saved questions" ON saved_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own saved questions
CREATE POLICY "Users can update their own saved questions" ON saved_questions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own saved questions
CREATE POLICY "Users can delete their own saved questions" ON saved_questions
  FOR DELETE USING (auth.uid() = user_id);

-- Create policy to allow service role to manage all saved questions
CREATE POLICY "Service role can manage all saved questions" ON saved_questions
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_saved_questions_updated_at 
  BEFORE UPDATE ON saved_questions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create users table for subscription and usage tracking
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro', 'pro+')),
  "questionsLeft" INTEGER NOT NULL DEFAULT 5,
  questions_reset_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own data
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Create policy to allow users to insert their own data
CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policy to allow users to update their own data
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Create policy to allow service role to manage all users
CREATE POLICY "Service role can manage all users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- Create trigger to automatically update updated_at for users table
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get user's question limit based on tier
CREATE OR REPLACE FUNCTION get_question_limit(user_tier TEXT)
RETURNS INTEGER AS $$
BEGIN
  CASE user_tier
    WHEN 'free' THEN RETURN 5;
    WHEN 'basic' THEN RETURN 20;
    WHEN 'pro' THEN RETURN 100;
    WHEN 'pro+' THEN RETURN 999999;
    ELSE RETURN 5;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to reset questionsLeft monthly
CREATE OR REPLACE FUNCTION reset_monthly_questions()
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET "questionsLeft" = get_question_limit(tier),
      questions_reset_date = questions_reset_date + INTERVAL '1 month'
  WHERE questions_reset_date <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Create questions table for question bank
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('biology', 'chemistry', 'physics', 'computer-science', 'mathematics', 'english', 'history', 'geography', 'other')),
  topic TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('foundation', 'higher', 'mixed')),
  marks INTEGER NOT NULL CHECK (marks > 0),
  mark_scheme TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('essay', 'short-answer', 'multiple-choice', 'text')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
CREATE INDEX IF NOT EXISTS idx_questions_level ON questions(level);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_marks ON questions(marks);

-- Enable Row Level Security
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to view questions
CREATE POLICY "Authenticated users can view questions" ON questions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow service role to manage all questions
CREATE POLICY "Service role can manage all questions" ON questions
  FOR ALL USING (auth.role() = 'service_role');

-- Create question_attempts table to track when users attempt questions from question bank
CREATE TABLE IF NOT EXISTS question_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  student_answer TEXT,
  score INTEGER,
  max_score INTEGER,
  highlights JSONB DEFAULT '[]',
  analysis JSONB DEFAULT '{}',
  detailed_feedback TEXT DEFAULT '',
  is_saved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, question_id, created_at) -- Allow multiple attempts but prevent duplicates
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_question_attempts_user_id ON question_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_question_id ON question_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_created_at ON question_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_attempts_user_question ON question_attempts(user_id, question_id);

-- Enable Row Level Security
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own attempts
CREATE POLICY "Users can view their own question attempts" ON question_attempts
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own attempts
CREATE POLICY "Users can insert their own question attempts" ON question_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own attempts
CREATE POLICY "Users can update their own question attempts" ON question_attempts
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow service role to manage all attempts
CREATE POLICY "Service role can manage all question attempts" ON question_attempts
  FOR ALL USING (auth.role() = 'service_role');

-- Create trigger to automatically update updated_at for question_attempts table
CREATE TRIGGER update_question_attempts_updated_at 
  BEFORE UPDATE ON question_attempts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Update saved_questions table to support multiple versions
ALTER TABLE saved_questions ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES questions(id) ON DELETE SET NULL;
ALTER TABLE saved_questions ADD COLUMN IF NOT EXISTS attempt_id UUID REFERENCES question_attempts(id) ON DELETE SET NULL;
ALTER TABLE saved_questions ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

-- Create index for the new columns
CREATE INDEX IF NOT EXISTS idx_saved_questions_question_id ON saved_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_saved_questions_attempt_id ON saved_questions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_saved_questions_version ON saved_questions(question_id, user_id, version_number);

-- Create policy to allow service role to manage all questions
CREATE POLICY "Service role can manage all questions" ON questions
  FOR ALL USING (auth.role() = 'service_role');

-- Create trigger to automatically update updated_at for questions table
CREATE TRIGGER update_questions_updated_at 
  BEFORE UPDATE ON questions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
