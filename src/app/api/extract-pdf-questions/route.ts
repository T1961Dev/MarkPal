import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfText } = body;

    if (!pdfText) {
      return NextResponse.json({ error: 'PDF text is required' }, { status: 400 });
    }

    // Use OpenAI to extract and analyze questions from the PDF text
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing exam papers and extracting questions. Your task is to:

1. Identify all text-based questions in the provided exam paper text
2. Extract each question with its number, text, and marks (if available)
3. Classify each question by type (essay, short-answer, multiple-choice, etc.)
4. Provide clean, well-formatted output

IMPORTANT RULES:
- Only extract actual questions that students need to answer
- Ignore instructions, general text, or non-question content
- Look for question patterns like "Question 1:", "1.", "Q1:", etc.
- Extract marks if mentioned (e.g., "(10 marks)", "[15]", etc.)
- Classify questions based on their wording and requirements
- If a question spans multiple lines, combine them into one coherent question
- Remove any formatting artifacts or OCR errors

Return a JSON array of questions with this exact structure:
[
  {
    "id": "question-1",
    "questionNumber": "1",
    "text": "Complete question text here",
    "marks": "10",
    "type": "essay|short-answer|multiple-choice|text"
  }
]

Question types:
- "essay": Questions requiring detailed explanations, analysis, or discussion
- "short-answer": Questions requiring brief, specific answers
- "multiple-choice": Questions with options to choose from
- "text": General text-based questions that don't fit other categories`
        },
        {
          role: "user",
          content: `Please extract all questions from this exam paper text:\n\n${pdfText}`
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
      throw new Error('Failed to parse question extraction results');
    }

    // Validate the response structure
    if (!Array.isArray(extractedQuestions)) {
      throw new Error('Invalid response format from OpenAI');
    }

    // Clean up and validate each question
    const cleanedQuestions = extractedQuestions.map((q: any, index: number) => ({
      id: q.id || `question-${index + 1}`,
      questionNumber: q.questionNumber || (index + 1).toString(),
      text: q.text?.trim() || '',
      marks: q.marks || null,
      type: q.type || 'text'
    })).filter(q => q.text.length > 10); // Filter out very short questions

    return NextResponse.json({
      success: true,
      data: {
        questions: cleanedQuestions,
        totalQuestions: cleanedQuestions.length,
        fullText: pdfText
      }
    });

  } catch (error) {
    console.error('PDF question extraction error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract questions from PDF'
    }, { status: 500 });
  }
}
