import {
  compareResumeWithLabd,
  extractResume,
  ResumeServiceError,
} from "./service.js";

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

  const jobDescription = request.body?.jobDescription?.trim();
  if (!jobDescription) {
    return response.status(400).json({
      success: false,
      error: {
        code: "JOB_DESCRIPTION_REQUIRED",
        message: "Add the job description you want your resume scored against.",
      },
    });
  }

  try {
    const resume = await extractResume(request.file);
    const analysis = await compareResumeWithLabd(resume.text, jobDescription);

    return response.json({
      success: true,
      message: "Resume analysis completed.",
      data: {
        fileName: resume.fileName,
        ...analysis,
      },
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
