import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import { app } from "../src/index.js";
import { scoreResume } from "../src/service.js";

let server;
let baseUrl;

function createPdf(text) {
  const content = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf);
}

function createScannedPdf() {
  const canvas = createCanvas(900, 1165);
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#111";
  context.font = "bold 78px Arial";
  context.fillText("JavaScript React", 75, 250);
  context.fillText("Node.js testing", 75, 390);
  const image = canvas.toBuffer("image/jpeg", 95);
  const pageContent = Buffer.from(
    "q\n612 0 0 792 0 0 cm\n/Im1 Do\nQ",
    "ascii",
  );
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "ascii"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "ascii"),
    Buffer.from(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>",
      "ascii",
    ),
    Buffer.concat([
      Buffer.from(`<< /Length ${pageContent.length} >>\nstream\n`, "ascii"),
      pageContent,
      Buffer.from("\nendstream", "ascii"),
    ]),
    Buffer.concat([
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`,
        "ascii",
      ),
      image,
      Buffer.from("\nendstream", "ascii"),
    ]),
  ];

  const parts = [Buffer.from("%PDF-1.4\n", "ascii")];
  const offsets = [0];
  let length = parts[0].length;

  for (const [index, object] of objects.entries()) {
    offsets.push(length);
    const entry = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`, "ascii"),
      object,
      Buffer.from("\nendobj\n", "ascii"),
    ]);
    parts.push(entry);
    length += entry.length;
  }

  const xrefOffset = length;
  parts.push(
    Buffer.from(
      `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
        .join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
      "ascii",
    ),
  );
  return Buffer.concat(parts);
}

function uploadForm(
  file,
  fileName = "resume.pdf",
  contentType = "application/pdf",
  jobDescription = "JavaScript developer with React, Node.js, and testing experience",
) {
  const form = new FormData();
  form.append("resume", new Blob([file], { type: contentType }), fileName);
  if (jobDescription !== null) form.append("jobDescription", jobDescription);
  return form;
}

test("matches short programming-language keywords", () => {
  const result = scoreResume(
    "C C++ C# R Node.js .NET",
    "C, C++, C#, R, Node.js, .NET",
  );

  assert.equal(result.score, 100);
  assert.equal(result.totalKeywords, 6);
});

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("scores extracted PDF resume text against the job description", async () => {
  const response = await fetch(`${baseUrl}/api/resume`, {
    method: "POST",
    body: uploadForm(
      createPdf("JavaScript developer React with testing experience"),
    ),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.fileName, "resume.pdf");
  assert.equal(body.data.score, 80);
  assert.deepEqual(body.data.matchedKeywords, ["developer", "javascript", "react", "testing"]);
  assert.deepEqual(body.data.missingKeywords, ["node.js"]);
  assert.equal(body.data.totalKeywords, 5);
  assert.equal(body.data.recommendations.length, 1);
});

test("OCRs a scanned PDF resume before scoring it", async () => {
  const response = await fetch(`${baseUrl}/api/resume`, {
    method: "POST",
    body: uploadForm(
      createScannedPdf(),
      "resume.pdf",
      "application/pdf",
      "JavaScript React Node.js testing",
    ),
  });
  const body = await response.json();

  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);
  assert.equal(body.data.score, 100, JSON.stringify(body));
  assert.deepEqual(
    new Set(body.data.matchedKeywords),
    new Set(["javascript", "react", "node.js", "testing"]),
  );
});

test("requires a job description", async () => {
  const response = await fetch(`${baseUrl}/api/resume`, {
    method: "POST",
    body: uploadForm(createPdf("Resume content"), "resume.pdf", undefined, null),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "JOB_DESCRIPTION_REQUIRED");
});

test("rejects job descriptions without useful keywords", async () => {
  const response = await fetch(`${baseUrl}/api/resume`, {
    method: "POST",
    body: uploadForm(createPdf("Resume content"), "resume.pdf", undefined, "the and for"),
  });
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "NO_JOB_KEYWORDS");
});

test("rejects files that are not PDFs with JSON", async () => {
  const response = await fetch(`${baseUrl}/api/resume`, {
    method: "POST",
    body: uploadForm(Buffer.from("not a PDF"), "resume.txt", "text/plain"),
  });
  const body = await response.json();

  assert.equal(response.status, 415);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "PDF_ONLY");
});

test("does not report success when a PDF has no extractable text", async () => {
  const response = await fetch(`${baseUrl}/api/resume`, {
    method: "POST",
    body: uploadForm(createPdf("")),
  });
  const body = await response.json();

  assert.equal(response.status, 422, JSON.stringify(body));
  assert.equal(body.success, false);
  assert.equal(body.error.code, "NO_RESUME_TEXT");
});

test("rejects uploads larger than 5 MiB with JSON", async () => {
  const response = await fetch(`${baseUrl}/api/resume`, {
    method: "POST",
    body: uploadForm(Buffer.alloc(5 * 1024 * 1024 + 1)),
  });
  const body = await response.json();

  assert.equal(response.status, 413);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "FILE_TOO_LARGE");
});

test("returns JSON when the resume field is missing", async () => {
  const response = await fetch(`${baseUrl}/api/resume`, {
    method: "POST",
    body: new FormData(),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "RESUME_REQUIRED");
});
