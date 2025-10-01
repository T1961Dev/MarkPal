-- Add paper_id column to questions table to track paper vs preloaded questions
ALTER TABLE questions ADD COLUMN IF NOT EXISTS paper_id UUID;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_from_paper BOOLEAN DEFAULT FALSE;

-- Create index for the new columns
CREATE INDEX IF NOT EXISTS idx_questions_paper_id ON questions(paper_id);
CREATE INDEX IF NOT EXISTS idx_questions_is_from_paper ON questions(is_from_paper);

-- Create papers table to store uploaded exam papers
CREATE TABLE IF NOT EXISTS papers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('biology', 'chemistry', 'physics', 'computer-science', 'mathematics', 'english', 'history', 'geography', 'other')),
  level TEXT NOT NULL CHECK (level IN ('foundation', 'higher', 'mixed')),
  exam_board TEXT,
  year INTEGER,
  total_questions INTEGER DEFAULT 0,
  extracted_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_papers_user_id ON papers(user_id);
CREATE INDEX IF NOT EXISTS idx_papers_subject ON papers(subject);
CREATE INDEX IF NOT EXISTS idx_papers_level ON papers(level);
CREATE INDEX IF NOT EXISTS idx_papers_created_at ON papers(created_at DESC);

-- Enable Row Level Security
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own papers
CREATE POLICY "Users can view their own papers" ON papers
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own papers
CREATE POLICY "Users can insert their own papers" ON papers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own papers
CREATE POLICY "Users can update their own papers" ON papers
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own papers
CREATE POLICY "Users can delete their own papers" ON papers
  FOR DELETE USING (auth.uid() = user_id);

-- Create policy to allow service role to manage all papers
CREATE POLICY "Service role can manage all papers" ON papers
  FOR ALL USING (auth.role() = 'service_role');

-- Create trigger to automatically update updated_at for papers table
CREATE TRIGGER update_papers_updated_at 
  BEFORE UPDATE ON papers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint for paper_id in questions table
ALTER TABLE questions ADD CONSTRAINT fk_questions_paper_id 
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE;
