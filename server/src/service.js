import { PDFParse } from "pdf-parse";
import english from "@tesseract.js-data/eng";
import { createWorker } from "tesseract.js";

const PDF_HEADER = Buffer.from("%PDF-");
const MIN_TEXT_CHARACTERS_BEFORE_OCR = 40;
const OCR_PAGE_WIDTH = 1600;
const SHORT_TECHNICAL_TERMS = new Set(["c", "c#", "r"]);
const STOP_WORDS = new Set(
  `a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves experience skills role job position candidate ability work team strong including using looking required preferred company responsibilities requirements.`.split(
    /\s+/,
  ),
);

function getJobKeywords(jobDescription) {
  const counts = new Map();
  const words =
    jobDescription.toLowerCase().match(/[a-z][a-z0-9+#.-]*/g) ?? [];

  for (const word of words) {
    const keyword = word.replace(/[.-]+$/g, "");
    if (
      (keyword.length < 3 && !SHORT_TECHNICAL_TERMS.has(keyword)) ||
      STOP_WORDS.has(keyword)
    ) {
      continue;
    }
    counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .map(([keyword]) => keyword);
}

export function scoreResume(resumeText, jobDescription) {
  const keywords = getJobKeywords(jobDescription);
  if (!keywords.length) {
    throw new ResumeServiceError(
      422,
      "NO_JOB_KEYWORDS",
      "Add more detail to the job description so it can be compared with your resume.",
    );
  }

  const resumeKeywords = new Set(
    (resumeText.toLowerCase().match(/[a-z][a-z0-9+#.-]*/g) ?? []).map(
      (keyword) => keyword.replace(/[.-]+$/g, ""),
    ),
  );
  const matchedKeywords = keywords.filter((keyword) =>
    resumeKeywords.has(keyword),
  );
  const missingKeywords = keywords.filter(
    (keyword) => !matchedKeywords.includes(keyword),
  );
  const score = Math.round((matchedKeywords.length / keywords.length) * 100);
  const recommendations = missingKeywords.slice(0, 5).map(
    (keyword) => `If you have relevant experience with ${keyword}, add it to your resume.`,
  );

  if (!recommendations.length) {
    recommendations.push(
      "Your resume covers the key terms found in this job description. Review each requirement to ensure your experience is clearly demonstrated.",
    );
  }

  return {
    score,
    matchedCount: matchedKeywords.length,
    totalKeywords: keywords.length,
    matchedKeywords: matchedKeywords.slice(0, 12),
    missingKeywords: missingKeywords.slice(0, 12),
    recommendations,
  };
}

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

  try {
    let result;
    try {
      result = await parser.getText({ pageJoiner: "" });
    } catch {
      throw new ResumeServiceError(
        422,
        "PDF_EXTRACTION_FAILED",
        "The PDF could not be read or its text could not be extracted.",
      );
    }

    const pagesToOcr = result.pages.filter(
      (page) => page.text.trim().length < MIN_TEXT_CHARACTERS_BEFORE_OCR,
    );
    const ocrTextByPage = new Map();

    if (pagesToOcr.length) {
      let worker;

      try {
        const screenshots = await parser.getScreenshot({
          partial: pagesToOcr.map((page) => page.num),
          desiredWidth: OCR_PAGE_WIDTH,
          imageDataUrl: false,
        });
        worker = await createWorker("eng", undefined, {
          langPath: english.langPath,
          gzip: english.gzip,
          cacheMethod: "none",
        });

        for (const screenshot of screenshots.pages) {
          const { data } = await worker.recognize(screenshot.data);
          ocrTextByPage.set(screenshot.pageNumber, data.text.trim());
        }
      } catch {
        throw new ResumeServiceError(
          422,
          "OCR_FAILED",
          "Text could not be extracted from the scanned PDF. Try a clearer scan or a text-based PDF.",
        );
      } finally {
        if (worker) await worker.terminate();
      }
    }

    const text = result.pages
      .map((page) => {
        const ocrText = ocrTextByPage.get(page.num);
        return [page.text.trim(), ocrText].filter(Boolean).join("\n");
      })
      .filter(Boolean)
      .join("\n\n")
      .trim();

    if (!text) {
      throw new ResumeServiceError(
        422,
        "NO_RESUME_TEXT",
        "The PDF contains no readable resume text. Try a clearer scan.",
      );
    }

    return {
      fileName: file.originalname,
      text,
    };
  } finally {
    await parser.destroy();
  }
}
