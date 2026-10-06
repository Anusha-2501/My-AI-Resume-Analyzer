import { PDFParse } from "pdf-parse";

const PDF_HEADER = Buffer.from("%PDF-");

export class ResumeServiceError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function extractResume(file) {
  if (!file.buffer.subarray(0, 1024).includes(PDF_HEADER)) {
    throw new ResumeServiceError(
      415,
      "PDF_ONLY",
      "The uploaded file is not a valid PDF.",
    );
  }

  const parser = new PDFParse({ data: file.buffer });
  let result;

  try {
    result = await parser.getText({ pageJoiner: "" });
  } catch {
    throw new ResumeServiceError(
      422,
      "PDF_EXTRACTION_FAILED",
      "The PDF could not be read or its text could not be extracted.",
    );
  } finally {
    await parser.destroy();
  }

  const text = result.pages
    .map((page) => page.text)
    .filter((pageText) => pageText.trim())
    .join("\n\n")
    .trim();

  if (!text) {
    throw new ResumeServiceError(
      422,
      "NO_RESUME_TEXT",
      "The PDF contains no extractable text.",
    );
  }

  return {
    fileName: file.originalname,
    text,
  };
}
