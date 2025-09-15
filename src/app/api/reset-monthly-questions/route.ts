import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Verify this is a server-side call or from a cron job
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET || 'your-secret-token'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminSupabaseClient()
    
    // Call the database function to reset monthly questions
    const { data, error } = await supabase.rpc('reset_monthly_questions')
    
    if (error) {
      console.error('Error resetting monthly questions:', error)
      return NextResponse.json({ error: 'Failed to reset questions' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Monthly questions reset successfully',
      data 
    })
  } catch (error) {
    console.error('Error in reset-monthly-questions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Allow GET for testing purposes (remove in production)
export async function GET() {
  try {
    const supabase = createAdminSupabaseClient()
    
    // Call the database function to reset monthly questions
    const { data, error } = await supabase.rpc('reset_monthly_questions')
    
    if (error) {
      console.error('Error resetting monthly questions:', error)
      return NextResponse.json({ error: 'Failed to reset questions' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Monthly questions reset successfully',
      data 
    })
  } catch (error) {
    console.error('Error in reset-monthly-questions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
