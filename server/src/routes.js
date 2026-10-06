import { Router } from "express";
import multer from "multer";
import { uploadResume } from "./controller.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 0,
    parts: 1,
  },
});

export const router = Router();

router.post("/", upload.single("resume"), uploadResume);
