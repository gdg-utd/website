import { FunctionsHttpError } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";
import { resumeUploadError, type Resume } from "@/lib/resume";

export const RESUME_BUCKET = "member-resumes";
const resumePathPattern = /^[a-f0-9-]{36}\/[a-f0-9-]{36}\/([A-Za-z0-9_-]{1,240})\.pdf$/;

export function describeResume(path: string | null | undefined): Resume | null {
  const match = path?.match(resumePathPattern);
  if (!path || !match) return null;
  return { path, name: Buffer.from(match[1], "base64url").toString("utf8") };
}

export async function storeResume(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: FormDataEntryValue | null,
): Promise<{ resume: Resume; error?: never } | { resume?: never; error: string }> {
  if (!(file instanceof File)) return { error: "Choose a PDF resume." };
  const validationError = resumeUploadError(file);
  if (validationError) return { error: validationError };
  const header = await file.slice(0, 5).text();
  if (header !== "%PDF-") return { error: "Choose a valid PDF resume." };

  const filename = Buffer.from(file.name.replace(/[\x00-\x1f\x7f]/g, "").trim());
  if (filename.length > 180) return { error: "Shorten the PDF filename and try again." };
  const { data, error } = await supabase.functions.invoke<{ path: string }>("resume-storage", {
    body: await file.arrayBuffer(),
    headers: {
      "Content-Type": "application/pdf",
      "X-Resume-Filename": filename.toString("base64url"),
    },
  });
  if (error instanceof FunctionsHttpError && error.context.status === 429) {
    return { error: "The resume upload limit has been reached. Try again later." };
  }
  const resume = describeResume(data?.path);
  if (error || !resume || !resume.path.startsWith(`${userId}/`)) {
    console.error("Unable to upload resume", error?.name ?? "missing-upload");
    return { error: "We could not upload your resume. Please try again." };
  }
  return { resume };
}
