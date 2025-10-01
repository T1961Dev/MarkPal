import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { markSchemeText } = body;

    if (!markSchemeText) {
      return NextResponse.json({ error: 'Mark scheme text is required' }, { status: 400 });
    }

    // Use OpenAI to extract and analyze questions from the mark scheme text
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing mark schemes and extracting questions. Your task is to:

1. Identify all questions in the provided mark scheme text
2. Extract each question with its number, text, and marks
3. Extract the complete mark scheme for each question
4. Format the mark scheme in the exact format specified

IMPORTANT RULES:
- Look for "Question X.X" or "Question X" patterns
- Extract the complete question text and mark allocation
- Extract ALL mark scheme content including:
  * Acceptable Answers
  * Additional Acceptable Points
  * AO / Spec Ref
  * Important Notes
  * Total marks
- Format mark schemes exactly as shown in the example
- Only extract questions that have complete mark schemes

Return a JSON array of questions with this exact structure:
[
  {
    "questionNumber": "10.1",
    "questionText": "Describe the process of photosynthesis and explain why it is important for life on Earth.",
    "maxMarks": 6,
    "markScheme": "Mark Scheme:\nQuestion 10.1 - Describe the process of photosynthesis and explain why it is important for life on Earth. [6 marks]\n\nAcceptable Answers:\n1. light energy absorbed by chlorophyll (1 mark)\n2. carbon dioxide + water → glucose + oxygen (1 mark)\n3. occurs in chloroplasts (1 mark)\n4. produces oxygen for respiration (1 mark)\n5. produces glucose for energy/storage (1 mark)\n6. removes carbon dioxide from atmosphere (1 mark)\n\nAdditional Acceptable Points:\n- light-dependent and light-independent stages (1 mark)\n- ATP and NADPH production (1 mark)\n- Calvin cycle (1 mark)\n\nAO / Spec Ref: AO1, AO2, 4.4.1.1\n\nImportant Notes:\n- do not accept \"sunlight\" instead of \"light energy\"\n- ignore references to temperature\n- ignore references to water as reactant only\n- do not accept \"makes food\" without glucose\n\nTotal: 6 marks maximum"
  }
]

Mark scheme format requirements:
- Start with "Mark Scheme:"
- Include the full question text with marks in brackets
- Include "Acceptable Answers:" section with numbered points
- Include "Additional Acceptable Points:" if present
- Include "AO / Spec Ref:" if present
- Include "Important Notes:" if present
- End with "Total: X marks maximum"`

        },
        {
          role: "user",
          content: `Please extract all questions from this mark scheme text:\n\n${markSchemeText}`
        }
      ],
      temperature: 0.1,
      max_tokens: 4000
    });

    const responseText = analysisResponse.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let extractedQuestions;
    try {
      extractedQuestions = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error('Failed to parse mark scheme question extraction results');
    }

    // Validate the response structure
    if (!Array.isArray(extractedQuestions)) {
      throw new Error('Invalid response format from OpenAI');
    }

    // Clean up and validate each question
    const cleanedQuestions = extractedQuestions.map((q: any, index: number) => ({
      questionNumber: q.questionNumber || (index + 1).toString(),
      questionText: q.questionText?.trim() || '',
      maxMarks: parseInt(q.maxMarks) || 1,
      markScheme: q.markScheme?.trim() || ''
    })).filter(q => q.questionText.length > 10 && q.markScheme.length > 20); // Filter out very short questions

    return NextResponse.json({
      success: true,
      data: {
        questions: cleanedQuestions,
        totalQuestions: cleanedQuestions.length,
        fullText: markSchemeText
      }
    });

  } catch (error) {
    console.error('Mark scheme question extraction error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract questions from mark scheme'
    }, { status: 500 });
  }
}
