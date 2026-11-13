"use client";

import { useState, useTransition } from "react";
import { ResumeInput } from "@/components/resume-input";
import { resumeUploadError, type Resume } from "@/lib/resume";
import { updateProfileResume } from "./resume-actions";

export function ProfileResumeField({ resume, profilePending }: { resume: Resume | null; profilePending: boolean }) {
  const [message, setMessage] = useState({ text: "", error: false });
  const [pending, startUpdate] = useTransition();

  function update(file: File | null) {
    const error = file ? resumeUploadError(file) : "";
    setMessage({ text: error, error: Boolean(error) });
    if (error) return;

    const data = new FormData();
    if (file) data.set("resume", file);
    else data.set("intent", "remove");

    startUpdate(async () => {
      try {
        const result = await updateProfileResume(data);
        setMessage({ text: result.message, error: result.error });
      } catch {
        setMessage({ text: "We could not update your resume. Please try again.", error: true });
      }
    });
  }

  return (
    <div className="dashboard-profile-full-field">
      <ResumeInput
        resume={resume}
        pending={pending || profilePending}
        error={message.error ? message.text : ""}
        status={pending ? "Updating resume…" : message.error ? "" : message.text}
        onUpload={update}
        onRemove={() => update(null)}
      />
    </div>
  );
}
