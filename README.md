# My AI Resume Analyzer

Compare a PDF resume with a job description and get an AI-generated match score, matched and missing requirements, a summary, and suggestions. Resume content is extracted and analyzed in memory; this app does not save uploaded files or analysis results.

## Run locally

Use Node.js 22.3 or newer. Install the frontend and server dependencies in separate terminals:

```sh
cd server
npm install
npm run dev
```

Set `LABD_API_KEY` in `server/.env` for local use, or configure it as a secret environment variable on the server deployment. The key is used only by the server and is never sent to the browser. `LABD_API_URL` can optionally override labd's default endpoint for testing or compatible deployments.

```sh
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite. During local development, Vite proxies `/api` and `/health` to the server on port 3000. To use a different server port, update the proxy target in `frontend/vite.config.js`.

## Use the analyzer

Choose a PDF resume up to 5 MiB, paste a job description, and select **Score my resume**. The server extracts the text and sends it with the job description to labd for an AI comparison. labd returns a match estimate, aligned and missing requirements, a summary, and suggestions. Treat the result as guidance, not a hiring decision or a substitute for reviewing the requirements.

Text PDFs and scanned image-only PDFs are supported. Scanned pages are rendered and OCR'd on the server using the bundled English Tesseract model before extracted text is sent to labd. DOC and DOCX files are not currently supported. OCR quality depends on scan clarity, and only English recognition is configured. Uploaded files and comparison results are not saved by this app; review labd's data-handling terms before sending sensitive personal information.

## Verify

```sh
cd server
npm test
```

```sh
cd frontend
npm run build
npm run lint
```