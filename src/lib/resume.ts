export const MAX_RESUME_BYTES = 4 * 1024 * 1024;
export const RESUME_FILE_HELP = "PDF only, up to 4 MB.";

export type Resume = {
  path: string;
  name: string;
};

export function resumeUploadError(file: File) {
  if (file.size > MAX_RESUME_BYTES) return "Choose a PDF that is 4 MB or smaller.";
  if (!file.size || !file.name.toLowerCase().endsWith(".pdf")) return "Choose a PDF résumé.";
  return "";
}

export function resumePreviewUrl(path: string) {
  return `/api/resumes?path=${encodeURIComponent(path)}`;
}
