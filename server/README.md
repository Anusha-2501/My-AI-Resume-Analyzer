# Resume Analyzer API

An Express API that accepts a PDF resume, extracts its text, and responds with JSON. Uploaded files are kept in memory and are not saved to disk.

The request flow is split across `src/index.js` (Express app and server startup), `src/routes.js`, `src/controller.js`, and `src/service.js`. MongoDB is not configured, and resume data is not persisted.

## Requirements

- Node.js 22.3 or newer

## Run

```sh
npm install
npm run dev
```

The server listens on port `3000` by default. Set `PORT` to use a different port.

## API

### `POST /api/resume`

Send a `multipart/form-data` request with one file in the `resume` field. The uploaded content must be a PDF no larger than 5 MiB.

Example:

```sh
curl -F "resume=@./resume.pdf" http://localhost:3000/api/resume
```

Successful response:

```json
{
  "success": true,
  "message": "Resume content extracted successfully.",
  "data": {
    "fileName": "resume.pdf",
    "text": "Extracted resume text..."
  }
}
```

Errors use the same JSON shape:

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
