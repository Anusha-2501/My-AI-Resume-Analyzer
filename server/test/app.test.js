import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { after, before, test } from "node:test";
import { createCanvas } from "@napi-rs/canvas";

let labdServer;
let labdBaseUrl;
let labdStatus = 200;
let labdContent = JSON.stringify({
  score: 84,
  matchedCount: 4,
  totalKeywords: 5,
  matchedKeywords: ["JavaScript", "React", "testing", "communication"],
  missingKeywords: ["Node.js"],
  summary: "Strong alignment with the role's core requirements.",
  recommendations: ["Add a concrete example of your Node.js experience if applicable."],
});
let receivedLabdRequest;
let receivedLabdAuthorization;

labdServer = createHttpServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  receivedLabdRequest = JSON.parse(Buffer.concat(chunks).toString());
  receivedLabdAuthorization = request.headers.authorization;
  response.writeHead(labdStatus, { "content-type": "application/json" });
  response.end(
    JSON.stringify({
      message: { content: labdContent },
      credits: { percentLeft: 99 },
    }),
  );
});
await new Promise((resolve) => labdServer.listen(0, "127.0.0.1", resolve));
labdBaseUrl = `http://127.0.0.1:${labdServer.address().port}/v1/api/chat`;
process.env.LABD_API_KEY = "test-labd-key";
process.env.LABD_API_URL = labdBaseUrl;
const { app } = await import("../src/index.js");

function resetLabdMock() {
  labdStatus = 200;
  labdContent = JSON.stringify({
    score: 84,
    matchedCount: 4,
    totalKeywords: 5,
    matchedKeywords: ["JavaScript", "React", "testing", "communication"],
    missingKeywords: ["Node.js"],
    summary: "Strong alignment with the role's core requirements.",
    recommendations: ["Add a concrete example of your Node.js experience if applicable."],
  });
  receivedLabdRequest = undefined;
  receivedLabdAuthorization = undefined;
}

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

test("sends the extracted resume and job description to labd for analysis", async () => {
  resetLabdMock();
  const response = await fetch(`${baseUrl}/api/resume`, {
    method: "POST",
    body: uploadForm(
      createPdf("JavaScript developer React with testing experience"),
    ),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(receivedLabdAuthorization, "Bearer test-labd-key");
  assert.equal(receivedLabdRequest.messages.length, 1);
  assert.equal(receivedLabdRequest.messages[0].role, "user");
  assert.match(receivedLabdRequest.messages[0].content, /JOB DESCRIPTION/);
  assert.match(receivedLabdRequest.messages[0].content, /JavaScript developer with React/);
  assert.match(receivedLabdRequest.messages[0].content, /JavaScript developer React with testing experience/);
  assert.equal(body.data.score, 84);
  assert.equal(body.data.summary, "Strong alignment with the role's core requirements.");
  assert.equal(body.data.creditsPercentLeft, 99);
  assert.deepEqual(body.data.missingKeywords, ["Node.js"]);
});

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await Promise.all(
    [server, labdServer].map(
      (activeServer) =>
        new Promise((resolve, reject) => {
          activeServer.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
});

test("scores extracted PDF resume text against the job description", async () => {
  resetLabdMock();
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
  assert.equal(body.data.score, 84);
  assert.deepEqual(body.data.matchedKeywords, ["JavaScript", "React", "testing", "communication"]);
  assert.deepEqual(body.data.missingKeywords, ["Node.js"]);
  assert.equal(body.data.totalKeywords, 5);
  assert.equal(body.data.recommendations.length, 1);
});

test("OCRs a scanned PDF resume before scoring it", async () => {
  resetLabdMock();
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
  assert.equal(body.data.score, 84, JSON.stringify(body));
  assert.match(receivedLabdRequest.messages[0].content, /JavaScript React/);
});

test("maps labd credit exhaustion to a useful API error", async () => {
  resetLabdMock();
  labdStatus = 402;
  const response = await fetch(`${baseUrl}/api/resume`, {
    method: "POST",
    body: uploadForm(createPdf("JavaScript developer")),
  });
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "LABD_CREDITS_EXHAUSTED");
});

test("rejects malformed labd comparison responses", async () => {
  resetLabdMock();
  labdContent = "not JSON";
  const response = await fetch(`${baseUrl}/api/resume`, {
    method: "POST",
    body: uploadForm(createPdf("JavaScript developer")),
  });
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "LABD_INVALID_RESPONSE");
});

test("requires a job description", async () => {
  resetLabdMock();
  const response = await fetch(`${baseUrl}/api/resume`, {
    method: "POST",
    body: uploadForm(createPdf("Resume content"), "resume.pdf", undefined, null),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "JOB_DESCRIPTION_REQUIRED");
});

test("rejects files that are not PDFs with JSON", async () => {
  resetLabdMock();
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
  resetLabdMock();
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
  resetLabdMock();
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
  resetLabdMock();
  const response = await fetch(`${baseUrl}/api/resume`, {
    method: "POST",
    body: new FormData(),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "RESUME_REQUIRED");
});
