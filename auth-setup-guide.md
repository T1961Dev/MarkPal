# Supabase Auth Setup Guide

This guide explains how to properly set up Supabase authentication with automatic user record creation.

## 1. Database Setup

### Step 1: Run the Migration
First, run the migration to add the `has_seen_welcome` column:

```sql
-- Add the has_seen_welcome column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN DEFAULT false;

-- Update existing users
UPDATE users 
SET has_seen_welcome = true 
WHERE has_seen_welcome IS NULL;

-- Make the column NOT NULL
ALTER TABLE users 
ALTER COLUMN has_seen_welcome SET NOT NULL;

-- Add comment
COMMENT ON COLUMN users.has_seen_welcome IS 'Tracks whether user has seen the welcome popup on first login';
```

### Step 2: Create the Database Trigger
Run the trigger creation script to automatically create user records:

```sql
-- Create the function that will be triggered
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, tier, questions_left, questions_reset_date, has_seen_welcome, full_name)
  VALUES (
    NEW.id,
    'free',
    5,
    (CURRENT_DATE + INTERVAL '30 days')::date,
    false,
    NEW.raw_user_meta_data->>'name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, anon, authenticated, service_role;
```

## 2. How It Works

### Authentication Flow:
1. **User submits registration form**
2. **`supabase.auth.signUp()` is called** with email, password, and name
3. **Supabase creates auth user** in `auth.users` table
4. **Database trigger fires** and creates corresponding record in `users` table
5. **Fallback check** ensures user record exists (in case trigger fails)
6. **User receives verification email**
7. **After email verification**, user can log in

### User Record Creation:
The system uses a **dual approach** for reliability:

1. **Primary**: Database trigger automatically creates user record
2. **Fallback**: Manual creation in auth context if trigger fails

### User Record Fields:
- `id`: Matches auth.users.id
- `tier`: Set to 'free' for new users
- `questions_left`: Set to 5 for free tier
- `questions_reset_date`: Set to 30 days from creation
- `has_seen_welcome`: Set to false (triggers welcome popup)
- `full_name`: Set to the name entered during signup

## 3. Benefits of This Approach

✅ **Proper Supabase Auth Integration**: Uses `supabase.auth.signUp()` as recommended
✅ **Automatic User Creation**: Database trigger handles user record creation
✅ **Fallback Safety**: Manual creation ensures user records always exist
✅ **Welcome Popup Support**: New users get the welcome popup
✅ **Error Resilience**: Registration doesn't fail if user record creation has issues
✅ **Email Verification**: Users must verify email before logging in

## 4. Testing

After setup, test the flow:

1. **Create new account** via registration form
2. **Check email** for verification link
3. **Verify email** and log in
4. **Dashboard should load** without "Error loading user data: {}"
5. **Welcome popup should appear** for first-time users

## 5. Troubleshooting

If you still see "Error loading user data: {}":

1. **Check database trigger** is installed correctly
2. **Verify column exists**: `has_seen_welcome` column in users table
3. **Check permissions**: Ensure RLS policies allow user creation
4. **Review logs**: Check browser console and Supabase logs for errors

The system is now properly integrated with Supabase auth and should handle user creation seamlessly!
