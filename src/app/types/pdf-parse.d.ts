declare module "pdf-parse" {
    interface PdfParseData {
      text: string;
      numpages: number;
      info: Record<string, any>;
      metadata: Record<string, any>;
    }
  
    function pdfParse(buffer: Buffer | Uint8Array | ArrayBuffer): Promise<PdfParseData>;
  
    export default pdfParse;
  }