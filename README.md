# My AI Resume Analyzer

Compare a PDF resume with a job description and get a keyword-match score, matched and missing terms, and suggestions. Resume content is extracted and analyzed in memory; the server does not save uploaded files or analysis results.

## Run locally

Use Node.js 22.3 or newer. Install the frontend and server dependencies in separate terminals:

```sh
cd server
npm install
npm run dev
```

```sh
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite. During local development, Vite proxies `/api` and `/health` to the server on port 3000. To use a different server port, update the proxy target in `frontend/vite.config.js`.

## Use the analyzer

Choose a PDF resume up to 5 MiB, paste a job description, and select **Score my resume**. The score is the percentage of distinct, non-stopword job-description keywords present in the extracted resume text. It is a keyword-overlap indicator, not an assessment of qualifications or a substitute for reviewing the requirements.

Text PDFs and scanned image-only PDFs are supported. Scanned pages are rendered and OCR'd on the server using the bundled English Tesseract model; resume content is not sent to an OCR provider. DOC and DOCX files are not currently supported. OCR quality depends on scan clarity, and only English recognition is configured.

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