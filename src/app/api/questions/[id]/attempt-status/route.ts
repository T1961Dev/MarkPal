import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { hasAttemptedQuestion, getLatestAttemptForQuestion } from '@/lib/supabase';

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

    const hasAttempted = await hasAttemptedQuestion(user.id, id);
    const latestAttempt = hasAttempted ? await getLatestAttemptForQuestion(user.id, id) : null;

    return NextResponse.json({
      success: true,
      data: {
        hasAttempted: !!hasAttempted,
        latestAttempt: latestAttempt,
        attemptCount: hasAttempted ? 1 : 0 // We'll enhance this later to get actual count
      }
    });

  } catch (error) {
    console.error('Get question attempt status API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch question attempt status' },
      { status: 500 }
    );
  }
}
