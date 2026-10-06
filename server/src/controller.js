import { extractResume, ResumeServiceError } from "./service.js";

export async function uploadResume(request, response) {
  if (!request.file) {
    return response.status(400).json({
      success: false,
      error: {
        code: "RESUME_REQUIRED",
        message: 'Upload a PDF file in the "resume" field.',
      },
    });
  }

  try {
    const data = await extractResume(request.file);

    return response.json({
      success: true,
      message: "Resume content extracted successfully.",
      data,
    });
  } catch (error) {
    if (error instanceof ResumeServiceError) {
      return response.status(error.status).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    throw error;
  }
}
