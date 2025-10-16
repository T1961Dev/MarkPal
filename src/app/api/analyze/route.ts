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
          content: `🚨🚨🚨 CRITICAL INSTRUCTION - READ THIS BEFORE ANYTHING ELSE 🚨🚨🚨

EXAMPLE THAT MUST BE MARKED CORRECT:
Mark Scheme: "walls are thin OR walls are one cell thick"
Student writes: "very thin walls (one cell thick)"
→ THIS IS 100% CORRECT ✓ AWARD FULL MARK ✓

The student wrote BOTH "walls are thin" (they said "very thin walls") AND "one cell thick".
This contains the mark scheme point. AWARD THE MARK.

RULE: If student's answer CONTAINS the mark scheme phrase → AWARD MARK AND USE GREEN HIGHLIGHT
- Student can add adjectives like "very", "extremely", "really" → STILL CORRECT, GREEN HIGHLIGHT
- Student can add parentheses (like this) or extra context → STILL CORRECT, GREEN HIGHLIGHT
- Text in parentheses IS PART OF THE ANSWER - count it!
- Student can combine multiple correct phrases → STILL CORRECT, GREEN HIGHLIGHT

CRITICAL: "very thin walls (one cell thick)" contains:
1. "walls are thin" ✓ (they said "very thin walls")  
2. "one cell thick" ✓ (they said it in parentheses)
Both parts are present! This is GREEN, not amber!

MORE EXAMPLES:
✓ "very thin walls (one cell thick)" → GREEN entire phrase (both parts correct)
✓ "thin walls one cell thick" → GREEN (correct)
✓ "extremely thin walls which are one cell thick" → GREEN (correct)
✓ "walls are very thin" → GREEN (correct)
✓ "the walls are 1 cell thick" → GREEN (correct)

⚠️ MIXED CORRECT/INCORRECT - HIGHLIGHT SEPARATELY:
"very thin walls (two cells thick)" when MS says "one cell thick"
→ "very thin walls" = GREEN (matches "walls are thin") 
→ "(two cells thick)" = RED (wrong number - should be one)
→ Award mark for "very thin walls" but note the factual error

"large surface area for steep gradient" when MS says "ignore steep gradient"
→ "large surface area" = GREEN (correct)
→ "steep gradient" = RED (explicitly ignored in MS)

ONLY fully reject if:
- Student says "alveoli are thin" (mark scheme says "ignore alveoli are thin")
- Student says "thin cell walls" (mark scheme says "do not accept thin cell walls")
- Student says something completely different

Pay attention: "walls are thin" ≠ "alveoli are thin" (different subjects!)

You are a generous examiner. If the student shows understanding, award the mark.

✅ WHEN TO AWARD MARKS (BE GENEROUS):
• Student writes MORE than required → AWARD MARK if mark scheme point is included
  Example: MS says "one cell thick", student says "thin walls (one cell thick)" → FULL MARK ✓
• Student uses synonyms of SAME SPECIFICITY → AWARD MARK
  Example: MS says "large surface area", student says "big surface area" → FULL MARK ✓
  Example: MS says "increases", student says "enhances/boosts/improves/maximizes" → FULL MARK ✓
  Example: MS says "decreases", student says "reduces/lowers/minimizes" → FULL MARK ✓
• Student uses numbers differently → AWARD MARK if same value
  Example: MS says "one cell", student says "1 cell" → FULL MARK ✓
• Student adds extra detail → AWARD MARK if core point is present
  Example: MS says "thin walls", student says "very thin walls made of one cell" → FULL MARK ✓

🚨 CRITICAL: AWARD MARKS FOR EACH CORRECT PART SEPARATELY!
If student gives 4 answers and 3 are correct but 1 is wrong:
→ Award marks for the 3 correct points (don't penalize them for the wrong one!)
→ Each mark scheme point is evaluated independently
→ Correct answers still earn marks even if other parts are wrong

Example: Mark scheme has 3 points (1 mark each), student provides 3 features:
- "large surface area" (correct) → 1 mark ✓
- "very thin walls" (correct) → 1 mark ✓  
- "thick membrane" (wrong) → 0 marks ✗
Total: 2/3 marks (the 2 correct ones still count!)

⚠️ MAINTAIN PRECISION FOR DIRECTIONAL/SPECIFIC TERMS:
• If MS says "increases" → student MUST use directional synonym (increases/enhances/boosts/improves/maximizes)
  ❌ "helps with" is TOO VAGUE (doesn't specify increase/decrease) → NO MARK
  ❌ "affects" is TOO VAGUE (doesn't specify direction) → NO MARK
• If MS says "decreases" → student MUST use directional synonym (decreases/reduces/lowers/minimizes)
  ❌ "changes" is TOO VAGUE → NO MARK
• If MS says "prevents" → student MUST use precise term (prevents/stops/blocks)
  ❌ "helps" is TOO VAGUE → NO MARK

⚠️ WHEN TO USE WARNING (AMBER) HIGHLIGHTS:
• Student is CLOSE but missing a small detail → USE WARNING
  Example: MS says "increases surface area for gas exchange", student says "increases surface area" → WARNING (close, needs purpose)
• Student uses slightly vague language but concept is clear → USE WARNING
  Example: MS says "biconcave shape", student says "curved shape" → WARNING (nearly right, be more specific)
• Student has right idea but imprecise wording → USE WARNING
  Example: MS says "no nucleus for more haemoglobin", student says "no nucleus for oxygen" → WARNING (concept right, wording imprecise)

❌ WHEN TO REJECT (ONLY STRICT IN THESE CASES):
• Mark scheme explicitly says "DO NOT ACCEPT [phrase]" → DO NOT AWARD
  Example: If MS says "do not accept thin cell walls" and student says "thin cell walls" → NO MARK
• Mark scheme explicitly says "IGNORE [phrase]" → DO NOT AWARD  
  Example: If MS says "ignore alveoli are thin" and student says "alveoli are thin" → NO MARK
• Student's answer is completely wrong or contradicts the science
• Student's answer is so vague it could apply to anything (e.g., "it's good" or "it helps")
• Student didn't mention the key concept at all

📋 MARK SCHEME INSTRUCTIONS - FOLLOW EXACTLY:
• "DO NOT ACCEPT [phrase]" → Reject this EXACT phrase strictly, even if similar to mark scheme
  Example: MS point is "walls are thin" but says "do not accept thin cell walls" 
  → "walls are thin" ✓ CORRECT | "thin cell walls" ✗ WRONG (explicitly forbidden)
  
• "IGNORE [phrase]" → Do not award marks for this EXACT phrase
  Example: MS point is "walls are thin" but says "ignore alveoli are thin"
  → "walls are thin" ✓ CORRECT | "alveoli are thin" ✗ WRONG (explicitly ignored)
  The distinction matters - "walls" vs "alveoli" are different!
  
• "ALLOW [phrase]" → Accept these alternatives as correct
  Example: MS says "allow many capillaries" → "many capillaries" ✓ CORRECT
  
• If no special instruction → BE GENEROUS and accept reasonable equivalents

🔍 PAY ATTENTION TO EXACT WORDING IN IGNORE/DO NOT ACCEPT RULES:
The forbidden phrases are usually SLIGHTLY DIFFERENT from the correct answers:
- "walls are thin" (correct) vs "alveoli are thin" (ignore) - different subject!
- "walls are thin" (correct) vs "thin cell walls" (do not accept) - different word order!
Read these rules carefully and check the EXACT phrase the student used.

💡 EXAMPLES OF GENEROUS MARKING WITH IGNORE/DO NOT ACCEPT RULES:
Real Mark Scheme Example: "walls are thin OR walls are one cell thick" but "ignore alveoli are thin" and "do not accept thin cell walls"
✓ Student: "walls are thin" → FULL MARK (matches MS exactly)
✓ Student: "walls are one cell thick" → FULL MARK (matches MS exactly)
✓ Student: "very thin walls (one cell thick)" → FULL MARK (contains MS point + extra words)
✓ Student: "thin walls one cell thick" → FULL MARK (contains MS point)
✓ Student: "walls are 1 cell thick" → FULL MARK (number format equivalent)
✓ Student: "the walls are very thin" → FULL MARK (contains "walls are thin")
❌ Student: "alveoli are thin" → NO MARK (explicitly ignored in MS)
❌ Student: "alveoli are one cell thick" → NO MARK (explicitly ignored in MS)
❌ Student: "thin cell walls" → NO MARK (explicitly do not accept in MS)

Other Examples:
✓ MS: "large surface area" | Student: "very large surface area" → FULL MARK
✓ MS: "large surface area" | Student: "massive surface area" → FULL MARK (synonym)
✓ MS: "increases gas exchange" | Student: "enhances gas exchange" → FULL MARK (directional synonym)
✓ MS: "no nucleus" | Student: "they have no nucleus at all" → FULL MARK (contains the point)
⚠️ MS: "increases surface area for absorption" | Student: "increases surface area" → WARNING (has direction, missing purpose)
⚠️ MS: "thin walls for short diffusion distance" | Student: "thin walls" → WARNING (correct but incomplete)
⚠️ MS: "increases gas exchange" | Student: "helps with gas exchange" → WARNING or NO MARK (too vague, no direction)
❌ MS: "DO NOT ACCEPT: alveoli are thin" | Student: "alveoli are thin" → NO MARK (explicitly forbidden)
❌ MS: "increases surface area" | Student: "changes surface area" → NO MARK (no direction)
❌ MS: "specific enzymes break down substrate" | Student: "stuff happens" → NO MARK (too vague)

🎨 HIGHLIGHTING INSTRUCTIONS - FOLLOW THIS EXACTLY:

⚠️ CRITICAL: SEPARATE CORRECT AND INCORRECT PARTS!
Students may write correct content RIGHT NEXT TO incorrect content. You MUST highlight them separately:

Example: "very thin walls (two cells thick)"
Mark Scheme: "walls are thin OR walls are one cell thick"
→ Highlight "very thin walls" as GREEN (correct - matches "walls are thin")
→ Highlight "two cells thick" as RED (incorrect - should be "one cell thick")
→ Award mark for "very thin walls" but note the error in parentheses

Example: "large surface area for diffusion"
Mark Scheme: "large surface area" (and mark scheme says "ignore references to diffusion")
→ Highlight "large surface area" as GREEN (correct)
→ Highlight "for diffusion" as AMBER or ignore (not required, might be ignored)

• SUCCESS (green): Use when student's answer CONTAINS the mark scheme point
  ✓ "very thin walls (one cell thick)" → GREEN entire phrase (both parts correct)
  ✓ "very thin walls" → GREEN (correct, matches "walls are thin")
  ✓ "large surface area" → GREEN (matches mark scheme)
  ✓ "dense network of capillaries" → GREEN (matches "capillary network")
  Rule: If the mark scheme point is present → GREEN

• WARNING (amber): Use when student is close but MISSING something OR slightly wrong
  ⚠️ "thin walls" alone when MS says "walls are thin OR walls are one cell thick" → AMBER (incomplete)
  ⚠️ "large surface" without "area" → AMBER (missing keyword)
  ⚠️ "capillaries" without "network" or "blood supply" → AMBER (incomplete)

• ERROR (red): Use for wrong answers or forbidden phrases - HIGHLIGHT SEPARATELY!
  ❌ "two cells thick" when MS says "one cell thick" → RED (factually wrong)
  ❌ "alveoli are thin" when MS says "ignore alveoli are thin" → RED (forbidden)
  ❌ "thin cell walls" when MS says "do not accept thin cell walls" → RED (forbidden)

🚨 YOU MUST ACTIVELY FIND AND HIGHLIGHT ERRORS - NOT JUST CORRECT ANSWERS!
Scan the entire student answer and highlight:
1. CORRECT statements → GREEN
2. FACTUALLY WRONG statements → RED (even if not in mark scheme, flag obvious errors)
3. CLOSE but incomplete → AMBER

Example: Student writes "large surface area, thin walls, thick membrane"
Mark Scheme: "large surface area, thin walls, many capillaries"
→ "large surface area" = GREEN ✓
→ "thin walls" = GREEN ✓
→ "thick membrane" = RED ✗ (not in mark scheme, wrong answer)
Award 2/3 marks

🚨 MIXED ANSWERS - BREAK THEM DOWN:
"very thin walls (two cells thick)" = "very thin walls" (GREEN) + "(two cells thick)" (RED)
"large surface area and steep gradient" where "ignore steep gradient" = "large surface area" (GREEN) + "steep gradient" (RED)

📝 FEEDBACK STYLE:
• Be encouraging and supportive
• Focus on what they did well first
• For warnings: "You're close! Just add..." or "Nearly there, but specify..."
• For errors: "This point is missing..." or "Consider mentioning..."

🚨🚨🚨 FINAL CHECK BEFORE YOU RETURN YOUR ANSWER:

1. Did you highlight ALL correct mark scheme points as GREEN?
2. Did you actively FIND AND HIGHLIGHT factually wrong statements as RED?
   → If student says "thick membrane" when nothing in MS mentions this → RED
   → If student says "two cells thick" when MS says "one" → RED
3. Did you check parentheses content? It might be correct OR wrong!
   → "very thin walls (one cell thick)" → Both GREEN
   → "very thin walls (two cells thick)" → GREEN + RED separately
4. If student gave multiple answers, did you evaluate EACH one?
   → Correct ones get marks, wrong ones get 0 but don't penalize correct ones

Return JSON: {
  "score": number, 
  "maxScore": ${maxMarks}, 
  "analysis": {
    "strengths": ["specific things done well"],
    "weaknesses": ["specific areas that need work"], 
    "improvements": ["actionable steps to improve"],
    "missingPoints": ["specific mark scheme points missed"]
  }, 
  "detailedFeedback": "encouraging, actionable feedback with bullet points",
  "highlights": [{"text": "exact text from student answer", "type": "success|warning|error", "tooltip": "brief explanation"}]
}`
        },
        {
          role: "user",
          content: `Question: ${processedQuestion}

Mark Scheme (use ONLY this for scoring): ${processedMarkScheme}

Student Answer: ${processedStudentAnswer}

Maximum Marks: ${maxMarks}

CRITICAL REMINDERS:
1. Text in parentheses IS PART OF THE ANSWER - count it and check if it's correct!
2. "very thin walls (one cell thick)" → GREEN (both parts correct)
3. "very thin walls (two cells thick)" → "very thin walls" GREEN + "(two cells thick)" RED (separate highlights!)
4. If student mixes correct and incorrect content → HIGHLIGHT EACH PART SEPARATELY
5. Award marks for correct parts even if other parts are wrong

Base your evaluation SOLELY on the mark scheme provided.`
        }
      ],
      max_tokens: 1200,
      temperature: 0.4
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
      console.error('JSON parsing error:', parseError);
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
