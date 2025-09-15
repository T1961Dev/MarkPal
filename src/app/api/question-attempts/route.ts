import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { 
  createQuestionAttempt, 
  getQuestionAttempts, 
  updateQuestionAttempt,
  hasAttemptedQuestion 
} from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { question_id, student_answer, score, max_score, highlights, analysis, detailed_feedback, is_saved } = body;

    if (!question_id) {
      return NextResponse.json(
        { success: false, error: 'Question ID is required' },
        { status: 400 }
      );
    }

    const attemptData = {
      user_id: user.id,
      question_id,
      student_answer: student_answer || null,
      score: score || null,
      max_score: max_score || null,
      highlights: highlights || [],
      analysis: analysis || { strengths: [], weaknesses: [], improvements: [], missingPoints: [] },
      detailed_feedback: detailed_feedback || '',
      is_saved: is_saved || false
    };

    const attempt = await createQuestionAttempt(attemptData);

    return NextResponse.json({
      success: true,
      data: attempt
    });

  } catch (error) {
    console.error('Create question attempt API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create question attempt' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('question_id');

    const attempts = await getQuestionAttempts(user.id, questionId || undefined);

    return NextResponse.json({
      success: true,
      data: attempts
    });

  } catch (error) {
    console.error('Get question attempts API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch question attempts' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { attempt_id, ...updates } = body;

    if (!attempt_id) {
      return NextResponse.json(
        { success: false, error: 'Attempt ID is required' },
        { status: 400 }
      );
    }

    const updatedAttempt = await updateQuestionAttempt(attempt_id, updates, user.id);

    return NextResponse.json({
      success: true,
      data: updatedAttempt
    });

  } catch (error) {
    console.error('Update question attempt API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update question attempt' },
      { status: 500 }
    );
  }
}
