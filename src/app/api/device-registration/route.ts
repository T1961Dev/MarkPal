import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { deviceFingerprint, userAgent, action, userId } = await req.json()
    
    if (!deviceFingerprint || !userAgent) {
      return NextResponse.json(
        { error: 'Device fingerprint and user agent are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()
    
    if (action === 'check') {
      // Check if device already has a registered account
      const { data: existingDevice, error } = await supabase
        .from('device_registrations')
        .select('user_id, created_at')
        .eq('device_fingerprint', deviceFingerprint)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking device registration:', error)
        return NextResponse.json(
          { error: 'Failed to check device registration' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        hasExistingAccount: !!existingDevice,
        registrationDate: existingDevice?.created_at || null
      })

    } else if (action === 'register') {
      
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required for registration' },
          { status: 400 }
        )
      }

      // Get client IP address
      const ipAddress = req.headers.get('x-forwarded-for') || 
                       req.headers.get('x-real-ip') || 
                       'unknown'

      // Check if device already registered
      const { data: existingDevice } = await supabase
        .from('device_registrations')
        .select('id')
        .eq('device_fingerprint', deviceFingerprint)
        .single()

      if (existingDevice) {
        return NextResponse.json(
          { error: 'Device already has a registered account' },
          { status: 409 }
        )
      }

      // Register new device
      const { data: newDevice, error: insertError } = await supabase
        .from('device_registrations')
        .insert({
          device_fingerprint: deviceFingerprint,
          user_id: userId,
          user_agent: userAgent,
          ip_address: ipAddress
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error registering device:', insertError)
        return NextResponse.json(
          { error: 'Failed to register device' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        deviceId: newDevice.id
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "check" or "register"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Device registration API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
