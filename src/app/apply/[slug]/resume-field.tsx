"use client";

import { RESUME_FILE_HELP, resumePreviewUrl, type Resume } from "@/lib/resume";
import { useFormStatus } from "react-dom";

export function ResumeField({
  resume,
  profileResume,
  error,
  uploading,
  onSelect,
  onUpload,
}: {
  resume: Resume | null;
  profileResume: Resume | null;
  error: string;
  uploading: boolean;
  onSelect: (resume: Resume | null) => void;
  onUpload: (file: File) => void;
}) {
  const { pending } = useFormStatus();

  return (
    <fieldset className="application-resume-field" disabled={pending || uploading} aria-describedby="application-resume-help">
      <legend>Résumé (optional)</legend>
      <p id="application-resume-help">{RESUME_FILE_HELP} Reviewers can open the résumé you submit.</p>
      {resume && (
        <a className="resume-preview" href={resumePreviewUrl(resume.path)} target="_blank" rel="noreferrer">
          Preview {resume.name} ↗
        </a>
      )}
      <div className="resume-controls">
        <label className="resume-upload">
          <span>{resume ? "Replace for this application" : "Upload résumé"}</span>
          <input
            type="file"
            aria-label={resume ? "Replace résumé for this application" : "Upload résumé for this application"}
            accept=".pdf,application/pdf"
            onChange={(event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              input.value = "";
              if (file) onUpload(file);
            }}
          />
        </label>
        {resume && <button className="resume-secondary" type="button" onClick={() => onSelect(null)}>Remove from application</button>}
        {profileResume && profileResume.path !== resume?.path && (
          <button className="resume-secondary" type="button" onClick={() => onSelect(profileResume)}>Use profile résumé</button>
        )}
      </div>
      {uploading && <p role="status">Uploading résumé…</p>}
      {error && <p className="resume-error" role="alert">{error}</p>}
    </fieldset>
  );
}
