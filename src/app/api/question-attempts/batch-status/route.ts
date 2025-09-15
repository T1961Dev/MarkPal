import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { hasAttemptedQuestion } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { questionIds } = body;

    if (!questionIds || !Array.isArray(questionIds)) {
      return NextResponse.json(
        { success: false, error: 'Question IDs array is required' },
        { status: 400 }
      );
    }

    // Batch fetch attempt statuses for all questions
    const attemptStatuses: Record<string, {
      hasAttempted: boolean;
      attemptCount: number;
      latestAttempt?: {
        id: string;
        score?: number;
        max_score?: number;
        created_at: string;
      };
    }> = {};
    
    // Use Promise.all to fetch all statuses in parallel
    const statusPromises = questionIds.map(async (questionId: string) => {
      try {
        const hasAttempted = await hasAttemptedQuestion(user.id, questionId);
        return {
          questionId,
          status: hasAttempted ? {
            hasAttempted: true,
            latestAttempt: hasAttempted,
            attemptCount: 1 // We'll enhance this later to get actual count
          } : {
            hasAttempted: false,
            attemptCount: 0
          }
        };
      } catch (error) {
        console.error(`Error fetching status for question ${questionId}:`, error);
        return {
          questionId,
          status: {
            hasAttempted: false,
            attemptCount: 0
          }
        };
      }
    });

    const results = await Promise.all(statusPromises);
    
    // Convert to object format
    results.forEach(({ questionId, status }) => {
      attemptStatuses[questionId] = status;
    });

    return NextResponse.json({
      success: true,
      data: attemptStatuses
    });

  } catch (error) {
    console.error('Batch attempt status API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch batch attempt statuses' },
      { status: 500 }
    );
  }
}

