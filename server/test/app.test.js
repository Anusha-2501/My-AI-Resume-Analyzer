import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { app } from "../src/index.js";

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

function uploadForm(file, fileName = "resume.pdf", contentType = "application/pdf") {
  const form = new FormData();
  form.append("resume", new Blob([file], { type: contentType }), fileName);
  return form;
}

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

test("extracts text from a PDF resume", async () => {
  const response = await fetch(`${baseUrl}/api/resume`, {
    method: "POST",
    body: uploadForm(createPdf("Resume content from PDF")),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.fileName, "resume.pdf");
  assert.match(body.data.text, /Resume content from PDF/);
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
