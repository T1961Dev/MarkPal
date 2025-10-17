// PDF text extraction utility using PDF.js
export class PDFTextExtractor {
  private static workerInitialized = false;

  static async extractText(file: File): Promise<string> {
    try {
      // Dynamic import to avoid SSR issues
      const pdfjsLib = await import('pdfjs-dist');
      
      // Initialize worker only once
      if (!this.workerInitialized) {
        // Use a more reliable worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
        this.workerInitialized = true;
      }

      // Convert file to array buffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
        disableFontFace: true,
        disableRange: true,
        disableStream: true
      }).promise;

      let fullText = '';
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Combine text items from the page
          const pageText = textContent.items
            .filter((item: any) => item.str && typeof item.str === 'string')
            .map((item: any) => item.str)
            .join(' ')
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
          
          if (pageText) {
            fullText += pageText + '\n\n';
          }
        } catch (pageError) {
          console.warn(`Error extracting text from page ${pageNum}:`, pageError);
          // Continue with other pages
        }
      }

      return fullText.trim();
    } catch (error) {
      console.error('PDF text extraction error:', error);
      throw new Error('Failed to extract text from PDF. Please ensure the file is a valid PDF.');
    }
  }

  // Alternative method using a simpler approach
  static async extractTextSimple(file: File): Promise<string> {
    try {
      // For now, return a placeholder that will be replaced by OpenAI analysis
      // In a production environment, you would implement proper PDF parsing here
      return `PDF_CONTENT_PLACEHOLDER_${file.name}_${Date.now()}`;
    } catch (error) {
      console.error('Simple PDF extraction error:', error);
      throw new Error('Failed to process PDF file');
    }
  }
}
