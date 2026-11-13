"use client";

import { useId, useRef } from "react";
import { RESUME_FILE_HELP, resumePreviewUrl, type Resume } from "@/lib/resume";

export function ResumeInput({
  resume,
  pending,
  error,
  status,
  onUpload,
  onRemove,
  onUseProfile,
}: {
  resume: Resume | null;
  pending: boolean;
  error: string;
  status?: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onUseProfile?: () => void;
}) {
  const headingId = useId();
  const helpId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadLabel = resume ? "Replace" : "Upload PDF";

  return (
    <div className="resume-field" role="group" aria-labelledby={headingId} aria-describedby={helpId} aria-busy={pending}>
      <span className="resume-label" id={headingId}>Resume</span>
      <div className="resume-row">
        {resume ? (
          <a className="resume-preview resume-filename" href={resumePreviewUrl(resume.path)} target="_blank" rel="noreferrer">
            {resume.name} <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span className="resume-filename resume-empty">No file attached</span>
        )}
        <input
          ref={inputRef}
          type="file"
          hidden
          aria-label="Resume PDF"
          accept=".pdf,application/pdf"
          disabled={pending}
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            input.value = "";
            if (file) onUpload(file);
          }}
        />
        <button className="resume-button" type="button" disabled={pending} onClick={() => inputRef.current?.click()}>
          {uploadLabel}
        </button>
        {resume && (
          <button className="resume-button resume-remove" type="button" aria-label="Remove resume" disabled={pending} onClick={onRemove}>
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
      <div className="resume-meta">
        <small id={helpId}>{RESUME_FILE_HELP}</small>
        {!resume && onUseProfile && (
          <button className="resume-use-profile" type="button" disabled={pending} onClick={onUseProfile}>Use profile resume</button>
        )}
      </div>
      {status && <p className="resume-message" role="status">{status}</p>}
      {error && <p className="resume-message resume-error" role="alert">{error}</p>}
    </div>
  );
}
