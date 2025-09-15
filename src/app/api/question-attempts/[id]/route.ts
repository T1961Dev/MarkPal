import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getQuestionAttempt } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before using them
    const { id } = await params;
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    
    const supabase = createServerSupabaseClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const attempt = await getQuestionAttempt(id, user.id);

    return NextResponse.json({
      success: true,
      data: attempt
    });

  } catch (error) {
    console.error('Get question attempt API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch question attempt' },
      { status: 500 }
    );
  }
}
