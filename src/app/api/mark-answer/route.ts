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
          content: `🚨 ABSOLUTE RULE #1 - READ THIS FIRST:
If a student's answer CONTAINS the mark scheme phrase (or a clear synonym), you MUST award the mark.
The student can add extra words before, after, or around the mark scheme point - this is ALLOWED and CORRECT.

CRITICAL EXAMPLES:
Mark Scheme: "walls are one cell thick"
✓ Student: "very thin walls (one cell thick)" → CORRECT - award mark, GREEN
✓ Student: "thin walls one cell thick" → CORRECT - award mark, GREEN
✓ Student: "extremely thin walls which are one cell thick" → CORRECT, GREEN
✓ Student: "walls are 1 cell thick" → CORRECT, GREEN

⚠️ MIXED CORRECT/INCORRECT - SEPARATE HIGHLIGHTS:
✓❌ Student: "very thin walls (two cells thick)"
→ "very thin walls" = GREEN (matches "walls are thin")
→ "(two cells thick)" = RED (wrong - should be "one")
→ Award mark for correct part, highlight error separately!

Mark Scheme: "large surface area"
✓ Student: "very large surface area" → CORRECT, GREEN
✓ Student: "massive surface area" → CORRECT, GREEN

DO NOT PENALIZE STUDENTS FOR ADDING DESCRIPTIVE WORDS. IF THE MARK SCHEME POINT IS PRESENT, AWARD THE MARK.

You are a friendly, supportive examiner. Mark GENEROUSLY - if the student shows understanding, award the mark.

✅ AWARD MARKS WHEN:
• Student writes the mark scheme point (or clear synonym) anywhere in their answer
• Student adds extra descriptive words around the mark scheme point
• Student uses synonyms that maintain the same specificity and meaning

🚨 CRITICAL: AWARD MARKS FOR EACH CORRECT PART SEPARATELY!
If student writes 4 points and 3 are correct but 1 is wrong:
→ Award marks for the 3 correct points
→ Do NOT penalize the correct points because one is wrong
→ Each mark scheme point is independent

Example: Student answers with 3 features, mark scheme has 3 points (1 mark each):
- Feature 1: "large surface area" (correct) → 1 mark ✓
- Feature 2: "very thin walls" (correct) → 1 mark ✓
- Feature 3: "thick membrane" (wrong - should be thin) → 0 marks ✗
Total: 2/3 marks (award marks for correct parts!)

⚠️ USE WARNING (amber) FOR:
• Close but missing a small detail
• Right idea but imprecise wording
• Partially correct needs minor improvement

❌ ONLY REJECT WHEN:
• Mark scheme says "DO NOT ACCEPT [phrase]" → Reject this EXACT phrase
  Example: MS says "do not accept thin cell walls" → "thin cell walls" ✗ NO MARK
• Mark scheme says "IGNORE [phrase]" → Do not award for this EXACT phrase
  Example: MS says "ignore alveoli are thin" → "alveoli are thin" ✗ NO MARK
  But "walls are thin" ✓ CORRECT (different subject!)
• Answer is completely wrong or contradicts science
• Too vague to mean anything specific

🔍 REAL EXAMPLE - PAY ATTENTION TO EXACT WORDING:
Mark Scheme: "walls are thin OR walls are one cell thick"
Also says: "ignore alveoli are thin" and "do not accept thin cell walls"

✓ "walls are thin" → CORRECT
✓ "very thin walls (one cell thick)" → CORRECT  
✓ "walls are one cell thick" → CORRECT
❌ "alveoli are thin" → NO MARK (explicitly ignored)
❌ "thin cell walls" → NO MARK (explicitly do not accept)

The distinction matters - check the EXACT phrase!

🎨 HIGHLIGHTING - SEPARATE CORRECT AND INCORRECT PARTS:

⚠️ CRITICAL: Students may write correct content RIGHT NEXT TO incorrect content!
You MUST highlight them separately:

Example: "very thin walls (two cells thick)"
Mark Scheme: "walls are thin OR walls are one cell thick"
→ Highlight "very thin walls" as GREEN (correct)
→ Highlight "two cells thick" as RED (wrong - should be "one cell thick")
→ Award mark for the correct part

Example: "large surface area and steep gradient"
If mark scheme says "ignore steep gradient":
→ Highlight "large surface area" as GREEN (correct)
→ Highlight "steep gradient" as RED or AMBER (ignored/not needed)

HIGHLIGHTING RULES:
• SUCCESS (green): Contains mark scheme point - award mark
• WARNING (amber): Nearly correct or close but incomplete
• ERROR (red): Factually wrong, forbidden, or contradicts mark scheme

🚨 YOU MUST ACTIVELY FIND AND HIGHLIGHT ERRORS:
Don't only highlight correct answers - scan the entire student answer for:
1. Factually incorrect statements (e.g., "two cells thick" when should be "one")
2. Content that contradicts the mark scheme
3. Explicitly forbidden phrases
4. Wrong or irrelevant information

Example: Student writes 3 points, mark scheme expects 3 points:
- Point 1: "large surface area" → GREEN (correct)
- Point 2: "thin walls" → GREEN (correct)
- Point 3: "thick membrane" → RED (wrong - not in mark scheme, factually incorrect)
Result: Highlight all 3 separately! Award 2/3 marks.

BREAK DOWN MIXED ANSWERS:
"correct part (wrong part)" → Highlight both separately!
"correct part and forbidden part" → Highlight both separately!

Return JSON:
{
  "score": number,
  "maxScore": number,
  "feedback": "encouraging, actionable feedback",
  "highlights": [{"text": "exact text", "type": "success|warning|error", "tooltip": "explanation"}],
  "strengths": ["things done well"],
  "improvements": ["how to improve"],
  "markingNotes": "marking summary"
}`
        },
        {
          role: "user",
          content: `Question: ${question}

Student Answer: ${studentAnswer}

Mark Scheme: ${markScheme}

Maximum Marks: ${maxMarks}

CRITICAL REMINDERS:
1. Highlight BOTH correct AND incorrect parts
2. "very thin walls (one cell thick)" → Both correct → GREEN
3. "very thin walls (two cells thick)" → Split: "very thin walls" GREEN + "(two cells thick)" RED
4. If student gives 4 points and 3 are right, 1 is wrong → Award 3/4 marks (highlight all 4 separately)
5. Actively scan for WRONG statements and highlight them RED
6. Check content in parentheses - might be correct OR wrong!

Please mark this answer and provide detailed feedback.`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
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
