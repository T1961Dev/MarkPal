import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    
    // Get the user ID from the request (you'll need to implement auth)
    const userId = req.headers.get('x-user-id') // This should be set by your auth middleware
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is Pro+
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('tier')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.tier !== 'pro+') {
      return NextResponse.json(
        { success: false, error: 'Pro+ subscription required' },
        { status: 403 }
      )
    }

    // Fetch user's papers
    const { data: papers, error } = await supabase
      .from('papers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching papers:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch papers' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: papers })
  } catch (error) {
    console.error('Error in papers API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const { title, filename, fileSize, subject, level, examBoard, year, extractedText } = await req.json()
    
    // Get the user ID from the request
    const userId = req.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is Pro+
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('tier')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.tier !== 'pro+') {
      return NextResponse.json(
        { success: false, error: 'Pro+ subscription required' },
        { status: 403 }
      )
    }

    // Create new paper record
    const { data: paper, error } = await supabase
      .from('papers')
      .insert({
        user_id: userId,
        title,
        filename,
        file_size: fileSize,
        subject,
        level,
        exam_board: examBoard,
        year,
        extracted_text: extractedText,
        total_questions: 0 // Will be updated when questions are extracted
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating paper:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create paper' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: paper })
  } catch (error) {
    console.error('Error in papers POST API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
