import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const topic = searchParams.get('topic');
    const level = searchParams.get('level');
    const difficulty = searchParams.get('difficulty');
    const marks = searchParams.get('marks');


    const supabase = createAdminSupabaseClient();
    
    let query = supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (subject) {
      query = query.eq('subject', subject);
    }
    if (topic) {
      query = query.eq('topic', topic);
    }
    if (level) {
      query = query.eq('level', level);
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }
    if (marks) {
      query = query.eq('marks', parseInt(marks));
    }

    console.log('API: Fetching questions with filters:', { subject, topic, level, difficulty, marks });
    
    const { data: questions, error } = await query;

    console.log('API: Query result:', { questions: questions?.length, error });

    if (error) {
      console.error('Error fetching questions:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: questions || []
    });

  } catch (error) {
    console.error('Questions API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, subject, topic, level, marks, mark_scheme, question_type, difficulty, paper_id, is_from_paper } = body;

    // Validate required fields
    if (!question || !subject || !topic || !level || !marks || !mark_scheme || !question_type || !difficulty) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from('questions')
      .insert({
        question,
        subject,
        topic,
        level,
        marks: parseInt(marks),
        mark_scheme,
        question_type,
        difficulty,
        paper_id: paper_id || null,
        is_from_paper: is_from_paper || false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating question:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create question' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Create question API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
