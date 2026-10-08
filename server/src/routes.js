import { Router } from "express";
import multer from "multer";
import { createUploadResumeHandler } from "./controller.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_JOB_DESCRIPTION_SIZE = 100 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 1,
    fieldSize: MAX_JOB_DESCRIPTION_SIZE,
    parts: 2,
  },
});

export function createResumeRouter({ saveAnalysis } = {}) {
  const router = Router();
  router.post(
    "/",
    upload.single("resume"),
    createUploadResumeHandler(saveAnalysis),
  );
  return router;
}
