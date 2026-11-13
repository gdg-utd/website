"use client";

import { useEffect, useId, useRef, useState } from "react";
import { resumePreviewUrl, type Resume } from "@/lib/resume";

export function ResumePreview({ resume }: { resume: Resume }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="resume-button resume-preview-button"
        type="button"
        aria-label="Preview resume"
        aria-haspopup="dialog"
        title="Preview resume"
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      </button>
      <dialog
        ref={dialog}
        className="resume-preview-dialog"
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="resume-preview-panel">
          <header className="resume-preview-header">
            <h2 id={titleId}>{resume.name}</h2>
            <button className="resume-button resume-remove" type="button" aria-label="Close preview" autoFocus onClick={() => dialog.current?.close()}>
              <span aria-hidden="true">×</span>
            </button>
          </header>
          {open && <ResumeDocument key={resume.path} resume={resume} />}
        </div>
      </dialog>
    </>
  );
}

function ResumeDocument({ resume }: { resume: Resume }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const source = resumePreviewUrl(resume.path);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";

    async function load() {
      try {
        const response = await fetch(`${source}&preview=1`, { signal: controller.signal });
        if (!response.ok) throw new Error("Preview unavailable");
        const pdf = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(pdf);
        setUrl(objectUrl);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }

    void load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source]);

  if (error) return <p className="resume-preview-status" role="alert">Could not load this resume. Close the preview and try again.</p>;
  if (!url) return <p className="resume-preview-status" role="status">Loading preview…</p>;

  return (
    <>
      <iframe className="resume-preview-document" src={url} title="Resume PDF" />
      <div className="resume-preview-footer">
        <a className="resume-preview" href={url} download={resume.name}>Download PDF</a>
      </div>
    </>
  );
}
