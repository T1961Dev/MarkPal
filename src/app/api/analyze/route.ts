import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getUser, decrementQuestionsLeft, updateUserStreak } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, markScheme, studentAnswer, maxMarks = 10, questionImage, markSchemeImage, studentAnswerImage, userId, accessToken } = body;

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

    if (!studentAnswer && !studentAnswerImage) {
      return NextResponse.json({ error: 'Student answer or student answer image is required' }, { status: 400 });
    }

    // Process images if provided
    let processedQuestion = question;
    let processedMarkScheme = markScheme;
    let processedStudentAnswer = studentAnswer;

    if (questionImage) {
      try {
        const questionResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Extract text from image and format it properly. For questions, include the question text with marks in brackets. For mark schemes, format as a proper mark scheme with numbered points and mark allocations."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract and format the question text from this image. Include the question text with marks in brackets like: 'Explain how a convex lens forms an image and describe the factors that affect image size. [6 marks]'"
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
              content: "Extract and format mark scheme text from image. Format it as a proper mark scheme with numbered points, mark allocations, and all necessary sections."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract and format the mark scheme from this image. Format it like this example:\n\nMark Scheme:\nQuestion 08.4 - Describe three features of the alveoli that help maximise gas exchange. [3 marks]\n\nAcceptable Answers:\n1. large surface / area (1 mark)\n2. (large) capillary network OR good / efficient blood supply (1 mark)\n3. walls are thin OR walls are one cell thick (1 mark)\n\nAdditional Acceptable Points:\n- allow large surface / area to volume (ratio) (1 mark)\n- allow many capillaries (1 mark)\n\nAO / Spec Ref: AO1, 4.1.3.1, 4.2.2.2\n\nImportant Notes:\n- ignore references to membranes\n- ignore alveoli are thin\n- ignore alveoli are one cell thick\n- do not accept thin cell walls\n- ignore references to alveoli being moist\n- ignore steep concentration gradient\n\nTotal: 3 marks maximum\n\nIMPORTANT: Be selective about what earns marks. Do not create too many numbered points. Focus on the most important concepts. The total marks must be realistic and not exceed the question's mark allocation."
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

    if (studentAnswerImage) {
      try {
        const studentAnswerResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Extract student answer text from image. Preserve the original formatting and structure of the handwritten answer."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract the student's handwritten answer from this image. Preserve the original structure and formatting. If the answer is handwritten, transcribe it accurately maintaining the student's original wording and structure."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: studentAnswerImage,
                    detail: "low"
                  }
                }
              ]
            }
          ],
          max_tokens: 500,
          temperature: 0.1
        });
        processedStudentAnswer = studentAnswerResponse.choices[0]?.message?.content || studentAnswer;
      } catch (error) {
        console.error('Error processing student answer image:', error);
        return NextResponse.json({ error: 'Failed to process student answer image' }, { status: 500 });
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
• Award marks for content that matches the MEANING of the mark scheme points
• UNDERLINED TERMS: Must be exact matches (no synonyms, no paraphrasing)
• NON-UNDERLINED TERMS: Accept GCSE-level synonyms, equivalent phrasings, and different number formats if meaning is correct
• ACCEPT NUMBER VARIATIONS: "1" = "one", "2" = "two", "3" = "three", etc. - these are equivalent
• ACCEPT REASONABLE PARAPHRASING: Students can express the same concept in different words - award marks for correct understanding
• REJECT VAGUE LANGUAGE: If student uses vague terms that lose specific meaning, do NOT award the mark
• "DO NOT ACCEPT" rules: Strictly reject listed phrases - no exceptions
• "IGNORE" rules: Ignore the specified content - no marks for these
• "ALLOW" rules: Accept the specified alternatives - award marks for these
• BE REASONABLE: Look for the core concept, not exact wording
• GENEROUS BUT FAIR: Award marks for correct understanding expressed in different words
• ONLY BE STRICT when mark scheme gives specific instructions like "DO NOT ACCEPT", "IGNORE", or "ALLOW"

MARK SCHEME STRUCTURE RULES:
• EACH BULLET POINT IS COMPLETE: Each numbered point in the mark scheme is a complete, self-contained answer
• NO PICK AND MIX: Students CANNOT combine parts from different bullet points to create a valid answer
• STATEMENT + REASON MUST MATCH: If a bullet point has both a statement and reason, BOTH must be from the SAME bullet point
• VAGUE PHRASES = NO MARK: If a student uses vague language that could apply to multiple points, do NOT award the mark
• EXAM STANDARD: Mark as if this were a real exam - be reasonable but fair
• ACCEPT REASONABLE EQUIVALENTS: If the student demonstrates understanding with different wording, award the mark
• BE GENEROUS WITH UNDERSTANDING: If the student shows they understand the concept, award the mark even if wording differs
• REJECT VAGUE ANSWERS: If student uses vague language that could apply to multiple concepts, do NOT award the mark
• ONLY REJECT when mark scheme specifically says "DO NOT ACCEPT" or "IGNORE", or when student uses vague language

SPECIFIC EXAMPLES:
• If mark scheme says "walls are one cell thick" and student says "walls are 1 cell thick" - this is EQUIVALENT and gets the MARK
• If mark scheme says "walls are thin OR walls are one cell thick" and student says "walls are thin" - this is CORRECT and gets the MARK
• If mark scheme says "flexible membrane allows squeezing through capillaries" and student says "flexible so it can squeeze through small spaces" - this is EQUIVALENT and gets the MARK
• If mark scheme says "biconcave shape increases surface area" and student says "concave shape gives more surface area" - this is EQUIVALENT and gets the MARK
• If mark scheme says "no nucleus allows more space for haemoglobin" and student says "no nucleus so more room for haemoglobin" - this is EQUIVALENT and gets the MARK
• If mark scheme says "3 stages of respiration" and student says "three stages of respiration" - this is EQUIVALENT and gets the MARK
• If mark scheme says "2 ATP molecules" and student says "two ATP molecules" - this is EQUIVALENT and gets the MARK
• If student paraphrases "large surface area" as "big surface area" - this is EQUIVALENT and gets the MARK
• If student says "it helps with gas exchange" when mark scheme says "increases gas exchange" - this is EQUIVALENT and gets the MARK
• If mark scheme says "increases surface area" and student says "change size" - this is TOO VAGUE and gets NO MARK
• If mark scheme says "increases surface area" and student says "makes it bigger" - this is EQUIVALENT and gets the MARK
• If mark scheme says "decreases diffusion distance" and student says "change distance" - this is TOO VAGUE and gets NO MARK

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
          content: `Question: ${processedQuestion}\n\nMark Scheme (use ONLY this for scoring): ${processedMarkScheme}\n\nStudent Answer: ${processedStudentAnswer}\n\nMaximum Marks: ${maxMarks}\n\nIMPORTANT: Base your evaluation SOLELY on the mark scheme provided. Do not use any external knowledge or assumptions.`
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
