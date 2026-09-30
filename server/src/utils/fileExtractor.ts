import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import path from "path";

export class FileExtractor {
  /**
   * Safely extract plain text from uploaded buffer based on filename extension and MIME type.
   */
  public static async extractText(buffer: Buffer, originalFilename: string): Promise<string> {
    const ext = path.extname(originalFilename).toLowerCase();

    switch (ext) {
      case ".txt":
      case ".md":
      case ".csv":
      case ".json":
      case ".log":
        return buffer.toString("utf-8");

      case ".pdf": {
        try {
          const pdfData = await pdfParse(buffer);
          return pdfData.text || "";
        } catch (err: any) {
          throw new Error(`Failed to parse PDF document: ${err.message}`);
        }
      }

      case ".docx": {
        try {
          const docxData = await mammoth.extractRawText({ buffer });
          return docxData.value || "";
        } catch (err: any) {
          throw new Error(`Failed to parse DOCX document: ${err.message}`);
        }
      }

      default:
        throw new Error(
          `Unsupported file format '${ext}'. Supported extensions: .txt, .md, .csv, .pdf, .docx`
        );
    }
  }
}
