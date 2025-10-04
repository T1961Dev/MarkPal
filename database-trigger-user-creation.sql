-- Database trigger to automatically create user records when auth.users are created
-- This ensures every new user gets a corresponding record in the users table

-- First, create the function that will be triggered
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_full_name TEXT;
BEGIN
  -- Extract the display_name from metadata
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'display_name', '');
  
  -- Log for debugging (remove in production)
  RAISE NOTICE 'Creating user with display_name: %', user_full_name;
  RAISE NOTICE 'Raw metadata: %', NEW.raw_user_meta_data;
  
  INSERT INTO public.users (id, tier, "questionsLeft", questions_reset_date, has_seen_welcome, "fullName")
  VALUES (
    NEW.id,
    'free',
    5,
    (CURRENT_DATE + INTERVAL '30 days')::date,
    false,
    user_full_name
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger that fires after a new user is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, anon, authenticated, service_role;

-- Create a policy to allow the trigger function to insert user records
CREATE POLICY "Allow trigger to create user records" ON public.users
  FOR INSERT WITH CHECK (true);
