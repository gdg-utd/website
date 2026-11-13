"use client";

import { useActionState } from "react";
import { RESUME_FILE_HELP, resumePreviewUrl, resumeUploadError, type Resume } from "@/lib/resume";
import { updateProfileResume } from "./resume-actions";

const initialState = { message: "", error: false };

export function ResumeSection({ resume }: { resume: Resume | null }) {
  const [state, action, pending] = useActionState(updateProfileResume, initialState);

  return (
    <section className="dashboard-profile-card dashboard-security-section" aria-labelledby="profile-resume-heading">
      <div className="dashboard-profile-section-heading">
        <div>
          <h2 id="profile-resume-heading">Résumé</h2>
          <p>Your default résumé is preselected on applications. You can change it for each application.</p>
        </div>
      </div>
      <form action={action}>
        <div className="dashboard-profile-grid dashboard-security-grid">
          {resume && (
            <a className="resume-preview" href={resumePreviewUrl(resume.path)} target="_blank" rel="noreferrer">
              Preview {resume.name} ↗
            </a>
          )}
          <label>
            <span>{resume ? "Replace default résumé" : "Upload a default résumé (optional)"}</span>
            <input
              name="resume"
              type="file"
              accept=".pdf,application/pdf"
              aria-describedby="profile-resume-help"
              disabled={pending}
              required
              onChange={(event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                input.setCustomValidity(file ? resumeUploadError(file) : "");
              }}
            />
            <small id="profile-resume-help">{RESUME_FILE_HELP}</small>
          </label>
          {state.message && <p role={state.error ? "alert" : "status"} className={state.error ? "resume-error" : ""}>{state.message}</p>}
        </div>
        <div className="dashboard-profile-actions resume-profile-actions">
          <p>Previously submitted applications keep their attached résumé.</p>
          <div className="resume-controls">
            {resume && (
              <button className="resume-secondary" type="submit" name="intent" value="remove" formNoValidate disabled={pending}>
                Remove default
              </button>
            )}
            <button type="submit" disabled={pending}>{pending ? "Updating…" : "Save résumé"}</button>
          </div>
        </div>
      </form>
    </section>
  );
}
