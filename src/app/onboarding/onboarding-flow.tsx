"use client";

import { useActionState, useState } from "react";
import { UtdProgramFields } from "@/components/utd-program-fields";
import {
  completeOnboarding,
  type OnboardingActionState,
} from "./actions";

type OnboardingFlowProps = {
  firstName: string;
  nextPath: string;
  profile: {
    degree: string | null;
    githubUrl: string | null;
    linkedinUrl: string | null;
    major: string | null;
    netId: string | null;
    portfolioUrl: string | null;
  };
};

const initialState: OnboardingActionState = { status: "idle", message: "" };

export function OnboardingFlow({ firstName, nextPath, profile }: OnboardingFlowProps) {
  const [step, setStep] = useState<"welcome" | "profile">("welcome");
  const [state, action, pending] = useActionState(completeOnboarding, initialState);

  return (
    <>
      <div
        className="onboarding-progress"
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuemin={1}
        aria-valuemax={2}
        aria-valuenow={step === "welcome" ? 1 : 2}
      >
        <span className={step === "profile" ? "is-profile" : ""} />
      </div>

      <section className="onboarding-panel" aria-live="polite">

        {step === "welcome" ? (
          <div className="onboarding-welcome-step">
            <p className="onboarding-eyebrow">Welcome, {firstName}</p>
            <h1>Your account is ready.</h1>
            <p className="onboarding-step-intro">
              Here&apos;s what you can do from your member dashboard.
            </p>

            <div className="onboarding-feature-list">
              <article className="onboarding-feature onboarding-feature-blue">
                <span aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M5 7.5h14v11H5zM9 7.5V5h6v2.5M5 11h14" /></svg>
                </span>
                <div>
                  <h2>Apply for open positions</h2>
                  <p>Complete applications and check their status in one place.</p>
                </div>
              </article>
              <article className="onboarding-feature onboarding-feature-green">
                <span aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M5 6.5h14v12H5zM8 4v5M16 4v5M5 10h14M8 14h3M13 14h3" /></svg>
                </span>
                <div>
                  <h2>Find events and RSVP</h2>
                  <p>See what&apos;s coming up and reserve your spot on the official GDG event page.</p>
                </div>
              </article>
            </div>

            <button className="onboarding-primary" type="button" onClick={() => setStep("profile")}>
              Continue <span aria-hidden="true">→</span>
            </button>
            <p className="onboarding-edit-note">You can change your profile details anytime in Profile settings.</p>
          </div>
        ) : (
          <form className="onboarding-profile-step" action={action}>
            <input type="hidden" name="next" value={nextPath} />
            <div className="onboarding-step-heading">
              <p className="onboarding-eyebrow">Your profile</p>
              <h1>A few details before you start.</h1>
              <p>Tell us a little about your studies. You can update this later.</p>
            </div>

            <div className="onboarding-field-grid">
              <label className="onboarding-full-field">
                <span>NetID <i aria-hidden="true">*</i></span>
                <input
                  name="netId"
                  defaultValue={profile.netId ?? ""}
                  maxLength={30}
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="abc123456"
                  pattern="[A-Za-z0-9]{2,30}"
                  required
                />
                <small>Use the NetID assigned by UT Dallas.</small>
              </label>

              <UtdProgramFields
                degreeName="degree"
                majorName="major"
                idPrefix="onboarding-program"
                defaultDegree={profile.degree}
                defaultMajor={profile.major}
                degreeRequired
                majorRequired
              />

              <div className="onboarding-link-heading onboarding-full-field">
                <span>Links <small>Optional</small></span>
              </div>

              <label>
                <span>GitHub</span>
                <input name="githubUrl" defaultValue={profile.githubUrl ?? ""} type="url" maxLength={2048} placeholder="https://github.com/username" />
              </label>
              <label>
                <span>LinkedIn</span>
                <input name="linkedinUrl" defaultValue={profile.linkedinUrl ?? ""} type="url" maxLength={2048} placeholder="https://linkedin.com/in/username" />
              </label>
              <label className="onboarding-full-field">
                <span>Portfolio</span>
                <input name="portfolioUrl" defaultValue={profile.portfolioUrl ?? ""} type="url" maxLength={2048} placeholder="https://yourname.com" />
              </label>
            </div>

            {state.message && <p className="onboarding-error" role="alert">{state.message}</p>}

            <div className="onboarding-actions">
              <button type="button" className="onboarding-back" onClick={() => setStep("welcome")} disabled={pending}>← Back</button>
              <button type="submit" className="onboarding-primary" disabled={pending}>
                {pending ? "Saving…" : "Finish setup"}
                {!pending && <span aria-hidden="true">→</span>}
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
