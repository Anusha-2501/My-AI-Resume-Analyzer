import { pathToFileURL } from "node:url";
import express from "express";
import multer from "multer";
import { router as resumeRouter } from "./routes.js";

export const app = express();
export default app;

app.disable("x-powered-by");

app.get("/health", (_request, response) => {
  response.json({ success: true, message: "Resume analyzer server is running" });
});

app.use("/api/resume", resumeRouter);

app.use((_request, response) => {
  response.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "The requested endpoint does not exist.",
    },
  });
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    const unexpectedField = error.code === "LIMIT_UNEXPECTED_FILE";

    return response.status(tooLarge ? 413 : 400).json({
      success: false,
      error: {
        code: tooLarge
          ? "FILE_TOO_LARGE"
          : unexpectedField
            ? "INVALID_FILE_FIELD"
            : "INVALID_UPLOAD",
        message: tooLarge
          ? "The PDF must be 5 MB or smaller."
          : unexpectedField
            ? 'Upload exactly one file using the "resume" field.'
            : "The file upload could not be processed.",
      },
    });
  }

  console.error("Unhandled request error:", error);
  return response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred.",
    },
  });
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Resume analyzer server listening on port ${port}`);
  });
}
