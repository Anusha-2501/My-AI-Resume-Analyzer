// Temporary regression check: extraction must work even when pdfjs's default
// relative worker path cannot resolve, which is the deployed condition.
import "./src/pdfRuntime.js";
import { PDFParse } from "pdf-parse";

console.log("globalThis.pdfjsWorker set:", typeof globalThis.pdfjsWorker?.WorkerMessageHandler);

function createPdf() {
  const content = "BT /F1 12 Tf 72 720 Td (Anusha Reddy Full Stack Developer) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [i, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

// Point the default worker path somewhere that does not exist. If extraction
// still succeeds, it is because the statically imported handler is being used
// rather than pdfjs's own dynamic import of workerSrc.
console.log("workerSrc before:", PDFParse.setWorker());
PDFParse.setWorker("file:///nonexistent/pdf.worker.mjs");
console.log("workerSrc now:", PDFParse.setWorker());

const parser = new PDFParse({ data: createPdf() });
try {
  const result = await parser.getText({ pageJoiner: "" });
  console.log("getText OK:", JSON.stringify(result.pages[0].text.trim()));
} catch (error) {
  console.log("getText FAILED:", error?.name, error?.message);
} finally {
  await parser.destroy();
}
