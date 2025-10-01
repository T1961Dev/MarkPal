# Database Migration Required

To fix the "Error loading user data: {}" issue for fresh accounts, you need to run the database migration to add the `has_seen_welcome` column.

## Steps:

1. **Open your Supabase Dashboard**
2. **Go to SQL Editor**
3. **Run the following SQL command:**

```sql
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
```

## What this fixes:

- **Fresh accounts** will no longer get the empty error object `{}`
- **Welcome popup** will properly show for first-time users
- **Existing users** won't see the welcome popup again
- **Database schema** will be consistent with the application code

## After running the migration:

1. Test creating a new account
2. The dashboard should load without errors
3. The welcome popup should appear for new users
