"use client";
import { FormErrorSummary } from "@/components/form-error-summary";
import { useActionState, useState } from "react";
import { UtdProgramFields } from "@/components/utd-program-fields";
import { initialEditFormState } from "@/lib/edit-form-state";
import { updateProfile } from "./actions";
import type { Resume } from "@/lib/resume";
import { ProfileResumeField } from "./profile-resume-field";

type ProfileValues = { first_name: string | null; last_name: string | null; net_id: string | null; degree: string | null; major: string | null; personal_email: string | null; linkedin_url: string | null; github_url: string | null; portfolio_url: string | null };
export function ProfileForm({ profile, email, resume }: { profile: ProfileValues | null; email: string; resume: Resume | null }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialEditFormState);
  const [dirty, setDirty] = useState(false);
  const savedValues = {
    firstName: profile?.first_name,
    lastName: profile?.last_name,
    netId: profile?.net_id,
    degree: profile?.degree,
    major: profile?.major,
    personalEmail: profile?.personal_email,
    linkedinUrl: profile?.linkedin_url,
    githubUrl: profile?.github_url,
    portfolioUrl: profile?.portfolio_url,
  };

  function value(name: keyof typeof savedValues) {
    const submitted = state.values?.[name];
    return state.values ? (typeof submitted === "string" ? submitted : "") : savedValues[name] ?? "";
  }

  function checkChanges(form: HTMLFormElement) {
    const data = new FormData(form);
    setDirty(Object.entries(savedValues).some(([name, saved]) => (data.get(name) ?? "") !== (saved ?? "")));
  }

  return (
      <form
        className="dashboard-profile-form"
        action={formAction}
        key={state.revision}
        onChange={(event) => {
          const form = event.currentTarget;
          // Read both academic fields after React applies a degree change.
          queueMicrotask(() => checkChanges(form));
        }}
        onSubmit={(event) => {
          if (!dirty || pending) event.preventDefault();
        }}
      >
        {state.error && <FormErrorSummary message={state.error}>Your changes are still here.</FormErrorSummary>}
        <section className="dashboard-profile-card" aria-labelledby="personal-information-heading">
          <div className="dashboard-profile-section-heading">
            <div>
              <h2 id="personal-information-heading">Personal information</h2>
              <p>Your UT Dallas email is connected to your account and cannot be edited here.</p>
            </div>
          </div>
          <div className="dashboard-profile-grid">
            <label>
              <span>First name <i aria-hidden="true">*</i></span>
              <input name="firstName" defaultValue={value("firstName")} maxLength={50} autoComplete="given-name" required />
            </label>
            <label>
              <span>Last name <i aria-hidden="true">*</i></span>
              <input name="lastName" defaultValue={value("lastName")} maxLength={50} autoComplete="family-name" required />
            </label>
            <label className="dashboard-profile-full-field">
              <span>UT Dallas email</span>
              <input value={email} type="email" autoComplete="email" readOnly aria-readonly="true" />
              <small>Managed through your sign-in account.</small>
            </label>
            <label className="dashboard-profile-full-field">
              <span>Personal email</span>
              <input
                name="personalEmail"
                defaultValue={value("personalEmail")}
                type="email"
                maxLength={320}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label>
              <span>NetID</span>
              <input name="netId" defaultValue={value("netId")} maxLength={30} autoCapitalize="none" autoCorrect="off" placeholder="abc123456" />
            </label>
            <UtdProgramFields
              degreeName="degree"
              majorName="major"
              idPrefix="profile-program"
              defaultDegree={value("degree")}
              defaultMajor={value("major")}
              majorClassName="dashboard-profile-full-field"
            />
            <ProfileResumeField resume={resume} profilePending={pending} />
          </div>
        </section>

        <section className="dashboard-profile-card" aria-labelledby="profile-links-heading">
          <div className="dashboard-profile-section-heading">
            <div>
              <h2 id="profile-links-heading">Links</h2>
              <p>Add links that help us learn more about your work and experience.</p>
            </div>
          </div>
          <div className="dashboard-profile-grid">
            <label>
              <span>LinkedIn</span>
              <input
                name="linkedinUrl"
                defaultValue={value("linkedinUrl")}
                type="url"
                maxLength={2048}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="https://www.linkedin.com/in/your-name"
              />
            </label>
            <label>
              <span>GitHub</span>
              <input
                name="githubUrl"
                defaultValue={value("githubUrl")}
                type="url"
                maxLength={2048}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="https://github.com/your-username"
              />
            </label>
            <label className="dashboard-profile-full-field">
              <span>Portfolio</span>
              <input
                name="portfolioUrl"
                defaultValue={value("portfolioUrl")}
                type="url"
                maxLength={2048}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="https://your-portfolio.com"
              />
            </label>
          </div>
        </section>

        {(dirty || pending) && (
          <div className="profile-save-pill">
            <p role="status">{pending ? "Saving profile…" : "You have unsaved changes."}</p>
            <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
          </div>
        )}
      </form>
  );
}
