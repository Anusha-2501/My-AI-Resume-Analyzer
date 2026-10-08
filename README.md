# My AI Resume Analyzer

Compare a PDF resume with a job description and get an AI-generated match score, matched and missing requirements, a summary, and suggestions. The extracted resume text, job description, and analysis are saved to MongoDB after scoring; the original uploaded PDF is not saved.

## Run locally

Use Node.js 22.3 or newer. Install the frontend and server dependencies in separate terminals:

```sh
cd server
npm install
npm run dev
```

Set `LABD_API_KEY`, `MONGODB_USERNAME`, and `MONGODB_PASSWORD` in `server/.env` for local use, or configure them as secret environment variables on the server deployment. These credentials are used only by the server and are never sent to the browser. `LABD_API_URL` can optionally override labd's default endpoint for testing or compatible deployments. MongoDB records are stored in the `resume_analyzer.analyses` collection; set `MONGODB_DATABASE` to use a different database name.

```sh
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite. During local development, Vite proxies `/api` and `/health` to the server on port 3000. To use a different server port, update the proxy target in `frontend/vite.config.js`.

## Use the analyzer

Choose a PDF resume up to 5 MiB, paste a job description, and select **Score my resume**. The server extracts the text and sends it with the job description to labd for an AI comparison. labd returns a match estimate, aligned and missing requirements, a summary, and suggestions. On success, the extracted text, job description, filename, score, comparison details, and creation time are inserted as an analysis document in MongoDB. The original PDF bytes are not stored. Treat the result as guidance, not a hiring decision or a substitute for reviewing the requirements.

Text PDFs and scanned image-only PDFs are supported. Scanned pages are rendered and OCR'd on the server using the bundled English Tesseract model before extracted text is sent to labd. DOC and DOCX files are not currently supported. OCR quality depends on scan clarity, and only English recognition is configured. Resume content and analysis are retained in MongoDB, so review your database access and retention settings as well as labd's data-handling terms before sending sensitive personal information. A database connection or write failure is reported as an API error; the app does not claim an analysis was saved when it was not.

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