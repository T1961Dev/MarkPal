import { NextRequest, NextResponse } from "next/server";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

// Required by pdfjs-dist in Node
import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf";
GlobalWorkerOptions.workerSrc = "pdfjs-dist/build/pdf.worker.min.js";

async function extractTextFromPDF(buffer: Buffer): Promise<string[]> {
  // Load the PDF into pdf.js
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    pages.push(pageText);
  }

  return pages;
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
