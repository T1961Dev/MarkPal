-- Migration to add device tracking for registration limits
-- Run this in your Supabase SQL editor

-- Create device_registrations table
CREATE TABLE IF NOT EXISTS device_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_fingerprint TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_registrations_fingerprint 
ON device_registrations(device_fingerprint);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_device_registrations_user_id 
ON device_registrations(user_id);

-- Add RLS policies
ALTER TABLE device_registrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own device registrations
CREATE POLICY "Users can view own device registrations" ON device_registrations
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can insert/update device registrations
CREATE POLICY "Service role can manage device registrations" ON device_registrations
  FOR ALL USING (auth.role() = 'service_role');

-- Policy: Allow users to update their own device last_seen
CREATE POLICY "Users can update own device last_seen" ON device_registrations
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE device_registrations IS 'Tracks device registrations to prevent multiple accounts per device';
