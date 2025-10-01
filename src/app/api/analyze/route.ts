import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getUser, decrementQuestionsLeft, updateUserStreak } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, markScheme, studentAnswer, maxMarks = 10, questionImage, markSchemeImage, userId, accessToken } = body;

    // Check if user has questions left
    if (userId) {
      const user = await getUser(userId, accessToken);
      if (!user || user.questionsLeft <= 0) {
        return NextResponse.json({ 
          error: 'No questions remaining. Please upgrade your plan to continue.',
          code: 'NO_QUESTIONS_LEFT'
        }, { status: 403 });
      }
    }

    if (!question && !questionImage) {
      return NextResponse.json({ error: 'Question or question image is required' }, { status: 400 });
    }

    if (!markScheme && !markSchemeImage) {
      return NextResponse.json({ error: 'Mark scheme or mark scheme image is required' }, { status: 400 });
    }

    if (!studentAnswer) {
      return NextResponse.json({ error: 'Student answer is required' }, { status: 400 });
    }

    // Process images if provided
    let processedQuestion = question;
    let processedMarkScheme = markScheme;

    if (questionImage) {
      try {
        const questionResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Extract text from image. Be concise."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract question text from this image."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: questionImage,
                    detail: "low"
                  }
                }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0.1
        });
        processedQuestion = questionResponse.choices[0]?.message?.content || question;
      } catch (error) {
        console.error('Error processing question image:', error);
        return NextResponse.json({ error: 'Failed to process question image' }, { status: 500 });
      }
    }

    if (markSchemeImage) {
      try {
        const markSchemeResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Extract text from image. Be concise."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract mark scheme text from this image."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: markSchemeImage,
                    detail: "low"
                  }
                }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0.1
        });
        processedMarkScheme = markSchemeResponse.choices[0]?.message?.content || markScheme;
      } catch (error) {
        console.error('Error processing mark scheme image:', error);
        return NextResponse.json({ error: 'Failed to process mark scheme image' }, { status: 500 });
      }
    }

    // Analyze the student answer against the mark scheme
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Faster model for speed
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
CHAINS OF REASONING: Award marks only when reasoning is complete and matches the scheme

HIGHLIGHTING REQUIREMENTS:
• Find specific words/phrases in the student's answer that match mark scheme points
• Use "success" for correct answers that earn marks
• Use "warning" for partially correct answers that need improvement
• Use "error" for incorrect or missing key terms
• Highlight EXACT text from the student's answer (not paraphrased)
• Provide brief tooltip explanations for each highlight

GRANULAR HIGHLIGHTING RULES:
• HIGHLIGHT EACH PART SEPARATELY: If a student writes "no nucleus so it can squeeze", highlight "no nucleus" as success (green) and "so it can squeeze" as error (red)
• CORRECT STATEMENT + WRONG REASON: Award mark for correct statement, but highlight the wrong reason as error
• MIXED SENTENCES: Break down sentences into correct and incorrect parts for separate highlighting
• PRECISE WORD MATCHING: Only highlight words that exactly match the mark scheme requirements
• NO BLANKET HIGHLIGHTING: Don't highlight entire sentences as one color - be specific about what's right and wrong

FEEDBACK REQUIREMENTS:
• Make ALL feedback actionable with specific bullet points
• Focus on WHAT to improve and HOW to improve it
• Give concrete examples of better answers
• Highlight exact text from student's answer

Return JSON: {
  "score": number, 
  "maxScore": ${maxMarks}, 
  "analysis": {
    "strengths": ["specific things done well"],
    "weaknesses": ["specific areas that need work"], 
    "improvements": ["actionable steps to improve"],
    "missingPoints": ["specific mark scheme points missed"]
  }, 
  "detailedFeedback": "concise actionable feedback with bullet points",
  "highlights": [{"text": "exact text from student answer", "type": "success|warning|error", "tooltip": "brief explanation"}]
}`
        },
        {
          role: "user",
          content: `Question: ${processedQuestion}\n\nMark Scheme (use ONLY this for scoring): ${processedMarkScheme}\n\nStudent Answer: ${studentAnswer}\n\nMaximum Marks: ${maxMarks}\n\nIMPORTANT: Base your evaluation SOLELY on the mark scheme provided. Do not use any external knowledge or assumptions.`
        }
      ],
      max_tokens: 800,
      temperature: 0.2
    });

    const analysisContent = analysisResponse.choices[0]?.message?.content;
    
    if (!analysisContent) {
      throw new Error('No analysis content received from OpenAI');
    }

    // Try to parse JSON response
    let analysis;
    try {
      analysis = JSON.parse(analysisContent);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response from the text
      analysis = {
        score: Math.round(maxMarks * 0.7), // Default score
        maxScore: maxMarks,
        analysis: {
          strengths: ["Good attempt at answering the question"],
          weaknesses: ["Could benefit from more specific examples"],
          improvements: ["Consider including more detailed explanations"],
          missingPoints: ["Some key concepts could be expanded"]
        },
        detailedFeedback: analysisContent,
        highlights: []
      };
    }

               // Decrement questions left and update streak for the user
      if (userId) {
        await decrementQuestionsLeft(userId, accessToken);
        await updateUserStreak(userId, accessToken);
      }

     return NextResponse.json({
       success: true,
       data: {
         ...analysis,
         question: processedQuestion,
         markScheme: processedMarkScheme
       }
     });

  } catch (error) {
    console.error('Error in analysis API:', error);
    return NextResponse.json(
      { error: 'Failed to analyze answer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
