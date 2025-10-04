import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { markSchemeText, questionText, maxMarks } = body;

    if (!markSchemeText) {
      return NextResponse.json({ error: 'Mark scheme text is required' }, { status: 400 });
    }

    // Use OpenAI to format the mark scheme using the same system as the question bank
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert GCSE examiner creating professional mark schemes. Transform the provided mark scheme text into a proper, structured mark scheme that matches real exam board standards.

CRITICAL REQUIREMENTS:
- Create a PROPER mark scheme that looks like a real exam mark scheme
- Use the EXACT max marks provided (${maxMarks || 10})
- Structure it like actual GCSE mark schemes with proper numbering
- Include all necessary sections for a complete mark scheme

MANDATORY STRUCTURE (use the SAME format as question bank mark schemes):
Award marks for: 1) [First key point] (1 mark), 2) [Second key point] (1 mark), 3) [Third key point] (1 mark), [continue with numbered points until max marks are allocated]

CRITICAL PARSING REQUIREMENTS:
- Use "Award marks for:" as the header (same as question bank)
- Each point MUST be numbered with parentheses: 1), 2), 3), etc.
- Each point MUST have "(X mark)" or "(X marks)" in parentheses
- All points should be on the SAME line, separated by commas
- This format matches exactly how question bank mark schemes are stored

MARK ALLOCATION RULES:
- Distribute the ${maxMarks || 10} marks across numbered points
- Each numbered point should be worth 1 mark (unless it's a complex point worth 2 marks)
- Ensure the total adds up to exactly ${maxMarks || 10} marks
- Create realistic, exam-standard marking points
- Make each point specific and measurable
- Include common student errors in "Important Notes"
- DO NOT give 1 mark for every bullet point - be realistic about mark distribution
- Consider the difficulty and complexity of each point
- Some points may be worth 2 marks if they require multiple elements
- Additional points should be worth 1 mark each
- Total marks must equal exactly ${maxMarks || 10}

PROFESSIONAL STANDARDS:
- Use formal, examiner language
- Be precise about what earns marks
- Include specific scientific/technical terms where appropriate
- Reference common misconceptions
- Use proper GCSE mark scheme terminology
- Ensure each point is a complete, standalone answer
- Make it look like a real exam board mark scheme

EXAMPLES OF GOOD MARKING POINTS (question bank format):
Award marks for: 1) large surface / area (1 mark), 2) (large) capillary network OR good / efficient blood supply (1 mark), 3) walls are thin OR walls are one cell thick (1 mark)

IMPORTANT: Create a realistic, professional mark scheme that could be used in a real GCSE exam. Distribute the ${maxMarks || 10} marks appropriately across numbered points.`
        },
        {
          role: "user",
          content: `Create a proper GCSE mark scheme from this text. The question is worth exactly ${maxMarks || 10} marks.

Question: ${questionText || 'Practice Question'}
Max Marks: ${maxMarks || 10}

Raw Mark Scheme Text:
${markSchemeText}

IMPORTANT INSTRUCTIONS:
- Create a professional mark scheme that looks like a real exam board mark scheme
- Distribute exactly ${maxMarks || 10} marks across numbered points
- Each numbered point should be worth 1 mark (or 2 marks for complex points)
- Make it realistic and exam-appropriate
- Include proper GCSE terminology and structure
- Add "Important Notes" section with common errors and restrictions
- Ensure the total marks add up to exactly ${maxMarks || 10}
- DO NOT create too many numbered points - be selective about what earns marks
- Focus on the most important concepts that would realistically be worth marks
- Consider that examiners don't give marks for every small detail

CRITICAL PARSING FORMAT (use question bank format):
- MUST use "Award marks for:" as the header
- Each point MUST be numbered with parentheses: 1), 2), 3), etc.
- Each point MUST have "(X mark)" or "(X marks)" in parentheses
- ALL points on the SAME line, separated by commas
- This matches exactly how question bank mark schemes are formatted

CRITICAL: The total marks in "Total: X marks maximum" must equal exactly ${maxMarks || 10}. Do not exceed this number.

Transform this into a proper, structured mark scheme that could be used in a real GCSE exam.`
        }
      ],
      temperature: 0.1,
      max_tokens: 3000
    });

    const formattedMarkScheme = completion.choices[0]?.message?.content;
    
    if (!formattedMarkScheme) {
      throw new Error('No response from OpenAI');
    }

    return NextResponse.json({ 
      success: true, 
      formattedMarkScheme 
    });

  } catch (error) {
    console.error('Error formatting mark scheme:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to format mark scheme' 
    }, { status: 500 });
  }
}
