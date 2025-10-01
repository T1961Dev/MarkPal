import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";

async function extractTextFromPDF(buffer: Buffer): Promise<string[]> {
  try {
    // Use pdf-parse for simple text extraction
    const pdfData = await pdfParse(buffer);
    
    // Split by common page break patterns or treat as single page
    const fullText = pdfData.text;
    
    // Try to split by page breaks if they exist
    let pages: string[] = [];
    if (fullText.includes('\f')) {
      // Use form feed character as page break
      pages = fullText.split('\f').filter(page => page.trim().length > 0);
    } else if (fullText.includes('\n\n')) {
      // Use double newlines as potential page breaks (less reliable)
      const paragraphs = fullText.split('\n\n');
      // Group paragraphs into pages (rough approximation)
      const paragraphsPerPage = Math.max(1, Math.ceil(paragraphs.length / pdfData.numpages));
      for (let i = 0; i < paragraphs.length; i += paragraphsPerPage) {
        const pageText = paragraphs.slice(i, i + paragraphsPerPage).join('\n\n');
        if (pageText.trim()) {
          pages.push(pageText);
        }
      }
    } else {
      // Single page
      pages = [fullText];
    }
    
    return pages;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text per page
    const pages = await extractTextFromPDF(buffer);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      totalPages: pages.length,
      textByPage: pages,
      fullText: pages.join("\n\n"),
    });
  } catch (err) {
    console.error("PDF parse error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
