import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, studentAnswer, markScheme, maxMarks } = body;

    if (!question || !studentAnswer || !markScheme || !maxMarks) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use OpenAI to mark the answer against the mark scheme
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert examiner. Mark strictly against the provided mark scheme.

MARKING RULES:
• Award marks ONLY for content matching the mark scheme
• UNDERLINED TERMS: Must be exact matches (no synonyms)
• NON-UNDERLINED TERMS: Accept GCSE-level synonyms if meaning correct
• "DO NOT ACCEPT" rules: Strictly reject listed phrases

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
