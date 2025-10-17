declare module "pdf-parse" {
    interface PdfParseData {
      text: string;
      numpages: number;
      info: Record<string, unknown>;
      metadata: Record<string, unknown>;
    }
  
    function pdfParse(buffer: Buffer | Uint8Array | ArrayBuffer): Promise<PdfParseData>;
  
    export default pdfParse;
  }