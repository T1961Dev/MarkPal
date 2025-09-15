import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getUser, decrementQuestionsLeft } from '@/lib/supabase';

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
          content: `You are an expert examiner. Mark strictly against the provided mark scheme. 

MARKING RULES:
• POSITIVE MARKING: Award marks for correct content, don't deduct for irrelevant content
• UNDERLINED TERMS: Must be exact matches (no synonyms)
• NON-UNDERLINED TERMS: Accept GCSE-level synonyms if meaning correct
• "DO NOT ACCEPT" rules: Strictly reject listed phrases
• CHAINS OF REASONING: Award marks only when reasoning is complete

HIGHLIGHTING REQUIREMENTS:
• Find specific words/phrases in the student's answer that match mark scheme points
• Use "success" for correct answers that earn marks
• Use "warning" for partially correct answers that need improvement
• Use "error" for incorrect or missing key terms
• Highlight EXACT text from the student's answer (not paraphrased)
• Provide brief tooltip explanations for each highlight

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

               // Decrement questions left for the user
      if (userId) {
        await decrementQuestionsLeft(userId, accessToken);
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
