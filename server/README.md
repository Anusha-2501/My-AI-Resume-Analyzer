# Resume Analyzer API

An Express API that accepts a PDF resume, extracts its text, and sends it with the job description to labd for an AI comparison. Uploaded files and results are kept in memory and are not saved by this app.

The request flow is split across `src/index.js` (Express app and server startup), `src/routes.js`, `src/controller.js`, and `src/service.js`. MongoDB is not configured, and resume data is not persisted.

## Requirements

- Node.js 22.3 or newer
- A labd API key

## Run

Set `LABD_API_KEY` in `.env` (the server loads `server/.env` automatically), then run:

```sh
npm install
npm run dev
```

The server listens on port `3000` by default. Set `PORT` to use a different port.
`LABD_API_URL` optionally overrides the default `https://agent.thedevlabs.io/v1/api/chat` endpoint. On deployments, configure these as server-side environment variables rather than committing `.env`.

## API

### `POST /api/resume`

Send a `multipart/form-data` request with one file in the `resume` field and a `jobDescription` text field. The uploaded content must be a PDF no larger than 5 MiB. Extracted resume text and the job description are sent to labd for analysis; this app does not save the upload or result.

Example:

```sh
curl -F "resume=@./resume.pdf" -F "jobDescription=Required skills and experience..." http://localhost:3000/api/resume
```

Successful response:

```json
{
  "success": true,
  "message": "Resume analysis completed.",
  "data": {
    "fileName": "resume.pdf",
    "score": 84,
    "matchedCount": 4,
    "totalKeywords": 5,
    "matchedKeywords": ["JavaScript", "React"],
    "missingKeywords": ["Node.js"],
    "summary": "Strong alignment with the role's core requirements.",
    "creditsPercentLeft": 99,
    "recommendations": ["Add a concrete example of your Node.js experience if applicable."]
  }
}
```

Analysis errors also use the same JSON shape. Labd authorization, credit, service availability, rate-limit, timeout, and invalid-response errors are reported with actionable messages.

```json
{
  "success": false,
  "error": {
    "code": "PDF_ONLY",
    "message": "The uploaded file is not a valid PDF."
  }
}
```

`GET /health` returns a JSON health status.
