# Device Registration Setup Guide

This guide will help you set up device registration limits to prevent users from creating multiple accounts on the same device.

## 1. Database Migration

Run the following SQL in your Supabase SQL editor:

```sql
-- Copy and paste the contents of database-migration-device-tracking.sql
```

This will create the `device_registrations` table with proper indexes and RLS policies.

## 2. How It Works

### Device Fingerprinting
- Creates a unique fingerprint based on browser characteristics
- Uses canvas fingerprinting, screen resolution, timezone, etc.
- Stores fingerprint in localStorage for persistence

### Registration Flow
1. User visits registration page
2. System generates/retrieves device fingerprint
3. Checks if device already has a registered account
4. If yes: Shows warning and disables registration
5. If no: Allows registration and stores device info

### Database Storage
- Stores device fingerprint, user ID, IP address, user agent
- Tracks creation and last seen timestamps
- Uses RLS policies for security

## 3. Features

### User Experience
- ✅ Clear warning when device already registered
- ✅ Shows registration date of existing account
- ✅ Disabled form when limit reached
- ✅ Link to login page for existing users

### Security
- ✅ Server-side validation
- ✅ IP address tracking
- ✅ User agent verification
- ✅ RLS policies protect data

### Bypass Prevention
- ✅ Multiple fingerprinting methods
- ✅ Persistent storage across sessions
- ✅ Server-side verification

## 4. Testing

### Test Registration Limit
1. Register an account on a device
2. Try to register another account on same device
3. Should see warning and disabled form

### Test Different Devices
1. Use different browsers/devices
2. Each should be able to register once
3. Clear browser data to test fingerprinting

## 5. Customization

### Adjust Fingerprinting
Edit `app/src/lib/device-fingerprint.ts`:
- Add more fingerprinting methods
- Modify hash algorithm
- Change localStorage keys

### Modify Registration Rules
Edit `app/src/app/api/device-registration/route.ts`:
- Change validation logic
- Add additional checks
- Modify error messages

### Update UI Messages
Edit `app/src/app/register/page.tsx`:
- Change warning text
- Modify styling
- Add additional information

## 6. Monitoring

### Check Device Registrations
```sql
SELECT 
  device_fingerprint,
  user_id,
  created_at,
  last_seen,
  ip_address
FROM device_registrations
ORDER BY created_at DESC;
```

### Find Duplicate Attempts
```sql
SELECT 
  device_fingerprint,
  COUNT(*) as registration_count
FROM device_registrations
GROUP BY device_fingerprint
HAVING COUNT(*) > 1;
```

## 7. Troubleshooting

### Device Not Recognized
- Check if localStorage is disabled
- Verify fingerprinting is working
- Check browser compatibility

### False Positives
- Users on shared computers
- Corporate networks with same IP
- Browser updates changing fingerprint

### Bypass Attempts
- Clear browser data
- Use different browsers
- VPN/proxy usage
- Browser developer tools

## 8. Future Enhancements

- Machine learning for better fingerprinting
- Behavioral analysis
- Integration with fraud detection
- Admin panel for device management
