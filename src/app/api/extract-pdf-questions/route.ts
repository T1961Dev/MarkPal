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
          content: `You are an expert at analyzing exam papers and extracting ONLY text-based questions that require written answers.

STRICT REQUIREMENTS - ONLY EXTRACT QUESTIONS THAT:
- Require ONLY written text answers
- Do NOT reference figures, diagrams, charts, or images
- Do NOT require mathematical calculations or equations
- Do NOT require filling in blanks or underlining
- Do NOT require drawing or sketching
- Do NOT reference external resources or appendices
- Are purely conceptual, analytical, or descriptive

EXCLUDE QUESTIONS THAT:
- Reference "Figure 1", "Diagram A", "Chart below", etc.
- Ask for calculations, formulas, or mathematical work
- Require "fill in the blanks" or "underline the correct answer"
- Ask students to "draw", "sketch", or "label diagrams"
- Reference page numbers, appendices, or external materials
- Require graph interpretation or data analysis from visual elements
- Are multiple choice with options A, B, C, D
- Ask to "circle" or "tick" answers

Look for patterns: "1.", "Question 1:", "Q1:", etc.
Extract marks: "(10 marks)", "[15]", etc.
Combine multi-line questions into single coherent questions.
Classify by type: essay (detailed analysis), short-answer (brief responses), or text (general written answers).

Return ONLY a valid JSON array with this exact structure:
[
  {
    "id": "question-1",
    "questionNumber": "1",
    "text": "Complete question text here",
    "marks": "10",
    "type": "essay|short-answer|text"
  }
]

CRITICAL: Return ONLY valid JSON. No markdown, no explanations, no additional text.`
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

    console.log('OpenAI response:', responseText);

    // Clean the response text to ensure it's valid JSON
    let cleanedResponse = responseText.trim();
    
    // Remove markdown code blocks if present
    cleanedResponse = cleanedResponse.replace(/^```json\s*|\s*```$/g, '').trim();
    
    // Remove any text before the first [ or after the last ]
    const firstBracket = cleanedResponse.indexOf('[');
    const lastBracket = cleanedResponse.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      cleanedResponse = cleanedResponse.substring(firstBracket, lastBracket + 1);
    }

    // Parse the JSON response
    let extractedQuestions;
    try {
      extractedQuestions = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', cleanedResponse);
      console.error('Parse error:', parseError);
      
      // Try to extract JSON from the response using regex
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          extractedQuestions = JSON.parse(jsonMatch[0]);
        } catch (secondParseError) {
          console.error('Second parse attempt failed:', secondParseError);
          throw new Error('Failed to parse question extraction results - invalid JSON format');
        }
      } else {
        throw new Error('Failed to parse question extraction results - no valid JSON found');
      }
    }

    // Validate the response structure
    if (!Array.isArray(extractedQuestions)) {
      throw new Error('Invalid response format from OpenAI');
    }

    // Clean up and validate each question
    const cleanedQuestions = extractedQuestions
      .map((q: { id?: string; questionNumber?: string; text?: string; marks?: string | number; type?: string }, index: number) => ({
        id: q.id || `question-${index + 1}`,
        questionNumber: q.questionNumber || (index + 1).toString(),
        text: q.text?.trim() || '',
        marks: q.marks || null,
        type: q.type || 'text'
      }))
      .filter(q => {
        // Filter out very short questions
        if (q.text.length < 20) return false;
        
        // Filter out questions that reference figures, diagrams, etc.
        const textLower = q.text.toLowerCase();
        const hasVisualReference = textLower.includes('figure') || 
                                 textLower.includes('diagram') || 
                                 textLower.includes('chart') || 
                                 textLower.includes('graph') ||
                                 textLower.includes('image') ||
                                 textLower.includes('picture');
        
        // Filter out mathematical questions
        const hasMath = textLower.includes('calculate') || 
                       textLower.includes('solve') || 
                       textLower.includes('equation') ||
                       textLower.includes('formula') ||
                       textLower.includes('work out');
        
        // Filter out fill-in-the-blank questions
        const hasBlanks = textLower.includes('fill in') || 
                         textLower.includes('complete') ||
                         textLower.includes('underline') ||
                         textLower.includes('circle') ||
                         textLower.includes('tick');
        
        // Filter out drawing questions
        const hasDrawing = textLower.includes('draw') || 
                          textLower.includes('sketch') || 
                          textLower.includes('label') ||
                          textLower.includes('mark on');
        
        // Only include questions that are purely text-based
        return !hasVisualReference && !hasMath && !hasBlanks && !hasDrawing;
      });

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
