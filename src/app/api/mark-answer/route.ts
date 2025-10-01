import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getUser, decrementQuestionsLeft, updateUserStreak } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, studentAnswer, markScheme, maxMarks, userId, accessToken } = body;

    if (!question || !studentAnswer || !markScheme || !maxMarks) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user has questions left and decrement
    if (userId) {
      const user = await getUser(userId, accessToken);
      if (!user || user.questionsLeft <= 0) {
        return NextResponse.json({ 
          success: false,
          error: 'No questions remaining. Please upgrade your plan to continue.',
          code: 'NO_QUESTIONS_LEFT'
        }, { status: 403 });
      }
      
      // Decrement questions left and update streak
      await decrementQuestionsLeft(userId, accessToken);
      await updateUserStreak(userId, accessToken);
    }

    // Use OpenAI to mark the answer against the mark scheme
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert examiner. Mark STRICTLY against the provided mark scheme.

CRITICAL MARKING RULES:
• Award marks ONLY for content that EXACTLY matches the mark scheme
• UNDERLINED TERMS: Must be exact matches (no synonyms, no paraphrasing)
• NON-UNDERLINED TERMS: Accept GCSE-level synonyms ONLY if meaning is correct
• "DO NOT ACCEPT" rules: Strictly reject listed phrases - no exceptions
• PARTIAL CORRECTNESS: Just because half the answer is partially correct does NOT mean they get 50% of the marks
• BE STRICT: Look at the mark scheme carefully - each mark point must be fully satisfied
• NO GENEROUS MARKING: Only award marks for complete, correct answers that match the scheme

MARK SCHEME STRUCTURE RULES:
• EACH BULLET POINT IS COMPLETE: Each numbered point in the mark scheme is a complete, self-contained answer
• NO PICK AND MIX: Students CANNOT combine parts from different bullet points to create a valid answer
• STATEMENT + REASON MUST MATCH: If a bullet point has both a statement and reason, BOTH must be from the SAME bullet point
• VAGUE PHRASES = NO MARK: If a student uses vague language that could apply to multiple points, do NOT award the mark
• EXAM STANDARD: Mark as if this were a real exam - be as strict as real examiners

SPECIFIC EXAMPLES:
• If mark scheme says "flexible membrane allows squeezing through capillaries" and student says "squeeze into tight spaces" - this is VAGUE and gets NO MARK
• If mark scheme says "biconcave shape increases surface area" and student says "large surface area" - this is INCOMPLETE and gets NO MARK
• If mark scheme says "no nucleus allows more space for haemoglobin" and student says "no nucleus so it can squeeze" - this mixes two different points and gets NO MARK

NO CONNECTING DOTS: Do NOT award marks by connecting separate parts of an answer to form a complete point
SPECIFIC TERMS REQUIRED: If a mark scheme requires specific terms (e.g., "flexible membrane"), the student must use those exact terms or clear synonyms
NO INFERENCE: Do not award marks for what the student "probably meant" - only award for what they actually wrote

HIGHLIGHTING REQUIREMENTS:
• Find specific words/phrases in the student's answer that match mark scheme points
• Use "success" for correct answers that earn marks
• Use "warning" for partially correct answers that need improvement
• Use "error" for incorrect or missing key terms
• Highlight EXACT text from the student's answer (not paraphrased)
• Provide ACTIONABLE tooltip explanations for each highlight:
  - For "warning": Explain what's missing and suggest specific improvements with examples
  - For "error": Explain why it's wrong and provide the correct alternative with exact wording
  - For "success": Confirm what they did well and encourage similar approaches

GRANULAR HIGHLIGHTING RULES:
• HIGHLIGHT EACH PART SEPARATELY: If a student writes "no nucleus so it can squeeze", highlight "no nucleus" as success (green) and "so it can squeeze" as error (red)
• CORRECT STATEMENT + WRONG REASON: Award mark for correct statement, but highlight the wrong reason as error
• MIXED SENTENCES: Break down sentences into correct and incorrect parts for separate highlighting
• PRECISE WORD MATCHING: Only highlight words that exactly match the mark scheme requirements
• NO BLANKET HIGHLIGHTING: Don't highlight entire sentences as one color - be specific about what's right and wrong
• Tooltips must be specific and actionable, not generic statements
• Include specific examples of better answers in tooltips
• Reference the mark scheme points when explaining corrections

FEEDBACK REQUIREMENTS:
• Make ALL feedback actionable with specific bullet points
• Focus on WHAT to improve and HOW to improve it
• Give concrete examples of better answers
• Be concise but specific

Return JSON:
{
  "score": number,
  "maxScore": number,
  "feedback": "concise actionable feedback with bullet points",
  "highlights": [{"text": "exact text from student answer", "type": "success|warning|error", "tooltip": "brief explanation"}],
  "strengths": ["specific things done well"],
  "improvements": ["actionable steps to improve"],
  "markingNotes": "brief marking summary"
}`
        },
        {
          role: "user",
          content: `Question: ${question}

Student Answer: ${studentAnswer}

Mark Scheme: ${markScheme}

Maximum Marks: ${maxMarks}

Please mark this answer and provide detailed feedback.`
        }
      ],
      temperature: 0.1,
      max_tokens: 800 // Reduced for faster response
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let markingResult;
    try {
      // Clean markdown code blocks if present
      let cleanResponse = responseText.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      markingResult = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error('Failed to parse marking results');
    }

    // Validate the response structure
    if (typeof markingResult.score !== 'number' || 
        typeof markingResult.maxScore !== 'number' ||
        !markingResult.feedback ||
        !Array.isArray(markingResult.highlights)) {
      throw new Error('Invalid response format from OpenAI');
    }

    // Ensure score is within valid range
    markingResult.score = Math.max(0, Math.min(markingResult.score, maxMarks));
    markingResult.maxScore = maxMarks;

    return NextResponse.json({
      success: true,
      data: markingResult
    });

  } catch (error) {
    console.error('Marking API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to mark answer' 
      },
      { status: 500 }
    );
  }
}
