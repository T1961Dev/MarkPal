import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { promises as fs } from "fs";
import { v4 as uuidv4 } from "uuid";
import PDFParser from "pdf2json";
import pdfParse from "pdf-parse";
import { createAdminSupabaseClient } from "@/lib/supabase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to determine subject from filename or content
function determineSubject(filename: string, content: string): string {
  const filenameLower = filename.toLowerCase();
  const contentLower = content.toLowerCase();
  
  // Check filename first
  if (filenameLower.includes('biology') || filenameLower.includes('bio')) return 'biology';
  if (filenameLower.includes('chemistry') || filenameLower.includes('chem')) return 'chemistry';
  if (filenameLower.includes('physics')) return 'physics';
  if (filenameLower.includes('computer') || filenameLower.includes('cs')) return 'computer-science';
  if (filenameLower.includes('math') || filenameLower.includes('maths')) return 'mathematics';
  if (filenameLower.includes('english') || filenameLower.includes('lang')) return 'english';
  if (filenameLower.includes('history')) return 'history';
  if (filenameLower.includes('geography') || filenameLower.includes('geo')) return 'geography';
  
  // Check content for subject indicators
  if (contentLower.includes('photosynthesis') || contentLower.includes('cell') || contentLower.includes('dna')) return 'biology';
  if (contentLower.includes('molecule') || contentLower.includes('reaction') || contentLower.includes('element')) return 'chemistry';
  if (contentLower.includes('force') || contentLower.includes('energy') || contentLower.includes('wave')) return 'physics';
  if (contentLower.includes('algorithm') || contentLower.includes('programming') || contentLower.includes('code')) return 'computer-science';
  if (contentLower.includes('equation') || contentLower.includes('calculate') || contentLower.includes('solve')) return 'mathematics';
  if (contentLower.includes('essay') || contentLower.includes('literature') || contentLower.includes('poem')) return 'english';
  if (contentLower.includes('war') || contentLower.includes('revolution') || contentLower.includes('ancient')) return 'history';
  if (contentLower.includes('climate') || contentLower.includes('population') || contentLower.includes('ecosystem')) return 'geography';
  
  return 'other';
}

export async function POST(req: NextRequest) {
  try {
    // Check user authentication and Pro+ plan
    const supabase = createAdminSupabaseClient();
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Invalid authentication" }, { status: 401 });
    }
    
    // Get user's plan tier
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tier')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData) {
      return NextResponse.json({ success: false, error: "User data not found" }, { status: 404 });
    }
    
    // Check if user has Pro+ plan
    if (userData.tier !== 'pro+') {
      return NextResponse.json({ 
        success: false, 
        error: "Pro+ plan required for exam paper uploads. Please upgrade your plan to access this feature." 
      }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const paperId = formData.get("paperId") as string;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ success: false, error: "File must be a PDF" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File size must be less than 10MB" }, { status: 400 });
    }

    // Generate a unique filename
    const fileName = uuidv4();
    
    // Convert the uploaded file into a temporary file
    // For Windows, use a path that starts from the root drive
    const tempFilePath = `C:/temp/${fileName}.pdf`;
    
    // Ensure temp directory exists
    try {
      await fs.mkdir("C:/temp", { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Convert ArrayBuffer to Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Save the buffer as a file
    await fs.writeFile(tempFilePath, fileBuffer);

    console.log(`Processing PDF: ${file.name}, saved to: ${tempFilePath}`);

    // Try pdf2json first, fallback to pdf-parse if it fails
    let parsedText = '';
    let totalPages = 1;

    try {
      // Parse the PDF using pdf2json
      const pdfParser = new (PDFParser as any)(null, 1);
      
      // Create a promise to handle the async PDF parsing
      const parsePromise = new Promise<string>((resolve, reject) => {
        pdfParser.on('pdfParser_dataError', (errData: any) => {
          console.error('PDF parsing error with pdf2json:', errData.parserError);
          reject(new Error(`PDF parsing failed: ${errData.parserError}`));
        });

        pdfParser.on('pdfParser_dataReady', () => {
          try {
            const rawText = (pdfParser as any).getRawTextContent();
            const pageCount = (pdfParser as any).getRawTextContent().split('\f').length;
            console.log('PDF parsed successfully with pdf2json, pages:', pageCount);
            console.log('Text length:', rawText.length);
            resolve(rawText);
          } catch (error) {
            reject(new Error('Failed to extract text from parsed PDF'));
          }
        });

        pdfParser.loadPDF(tempFilePath);
      });

      // Wait for PDF parsing to complete
      parsedText = await parsePromise;
      
    } catch (pdf2jsonError) {
      console.log('pdf2json failed, trying pdf-parse as fallback...');
      console.error('pdf2json error:', pdf2jsonError);
      
      // Fallback to pdf-parse
      try {
        const pdfData = await pdfParse(fileBuffer);
        parsedText = pdfData.text;
        totalPages = pdfData.numpages || 1;
        console.log('PDF parsed successfully with pdf-parse fallback, pages:', totalPages);
        console.log('Text length:', parsedText.length);
      } catch (pdfParseError) {
        console.error('Both PDF parsing methods failed:', pdfParseError);
        throw new Error('Failed to extract text from PDF. The file may be corrupted, encrypted, or not a valid PDF.');
      }
    }

    // Clean up temporary file
    try {
      await fs.unlink(tempFilePath);
    } catch (error) {
      console.warn('Failed to delete temporary file:', error);
    }

    if (!parsedText || parsedText.trim().length < 50) {
      throw new Error("Could not extract sufficient text from PDF. Ensure it contains readable text.");
    }

    // Split text by page breaks for page-by-page data
    // pdf2json uses \f for page breaks, pdf-parse doesn't have page breaks
    const pages = parsedText.includes('\f') 
      ? parsedText.split('\f').filter(page => page.trim().length > 0)
      : [parsedText]; // For pdf-parse fallback, treat as single page
    const fullText = parsedText.trim();
    totalPages = pages.length || 1;

    // Truncate if too long
    const maxChars = 480000; // ~120k tokens
    const truncatedText =
      fullText.length > maxChars ? fullText.substring(0, maxChars) + "\n\n[Text truncated]" : fullText;

    // Ask OpenAI to extract questions
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Extract ONLY pure text-based questions from exam text. Return JSON array:
[{"id":"q1","questionNumber":"1","text":"question text","marks":"10","type":"essay|short-answer|multiple-choice|text"}]

STRICT RULES - ONLY INCLUDE QUESTIONS THAT:
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

Look for patterns: "1.", "Question 1:", "Q1:", etc.
Extract marks: "(10 marks)", "[15]", etc.
Combine multi-line questions into single coherent questions.
Classify by type: essay (detailed analysis), short-answer (brief responses), multiple-choice, or text (general written answers).`
        },
        {
          role: "user",
          content: `Extract ONLY pure text-based questions from:\n\n${truncatedText}`
        }
      ],
      temperature: 0.1,
      max_tokens: 3000
    });

    let responseText = completion.choices[0]?.message?.content;
    if (!responseText) throw new Error("No response from OpenAI");

    // Clean markdown code blocks
    responseText = responseText.replace(/^```json\s*|\s*```$/g, "").trim();

    const extractedQuestions = JSON.parse(responseText);
    if (!Array.isArray(extractedQuestions)) throw new Error("Invalid response format from OpenAI");

    const cleanedQuestions = extractedQuestions
      .map((q: any, idx: number) => ({
        id: q.id || `question-${idx + 1}`,
        questionNumber: q.questionNumber || (idx + 1).toString(),
        text: q.text?.trim() || "",
        marks: q.marks || null,
        type: q.type || "text"
      }))
      .filter(q => q.text.length > 10);

    // Note: Questions are NOT automatically saved to question bank here
    // They will be saved later after mark scheme processing is complete

    return NextResponse.json({
      success: true,
      data: {
        questions: cleanedQuestions,
        totalQuestions: cleanedQuestions.length,
        fullText,
        textByPage: pages,
        fileName: file.name,
        pdfMetadata: {
          totalPages
        }
      }
    });
  } catch (err) {
    console.error("PDF processing error:", err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
