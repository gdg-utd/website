"use client";

import { useActionState, useState } from "react";
import { getPasswordStrength } from "@/lib/password";
import { updatePassword, type PasswordActionState } from "./password-actions";

const initialState: PasswordActionState = {
  status: "idle",
  message: "",
};

export function PasswordResetSection({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [state, formAction, pending] = useActionState(updatePassword, initialState);
  const passwordStrength = getPasswordStrength(password);
  const matches = confirmation.length > 0 && confirmation === password;
  const mismatch = confirmation.length > 0 && confirmation !== password;

  return (
    <section className="dashboard-profile-card dashboard-security-section" aria-labelledby="security-heading">
      <div className="dashboard-profile-section-heading dashboard-security-heading">
        <div>
          <h2 id="security-heading">Security</h2>
          <p>Change the password used to access your applicant dashboard.</p>
        </div>
        <button
          className="dashboard-security-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="password-reset-fields"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Cancel" : "Reset password"}
        </button>
      </div>

      {open && (
        <form action={formAction} id="password-reset-fields">
          {initiallyOpen && (
            <p className="dashboard-security-recovery-note" role="status">
              <span aria-hidden="true">✓</span>
              Your reset link was verified. Choose a new password below.
            </p>
          )}
          <div className="dashboard-profile-grid dashboard-security-grid">
            <label className="dashboard-profile-full-field">
              <span>New password</span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                aria-describedby="reset-password-strength"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <div
                className={`auth-password-strength auth-password-strength-${passwordStrength.score}`}
                id="reset-password-strength"
                aria-live="polite"
              >
                <div className="auth-password-strength-heading">
                  <span>Password strength</span>
                  <strong>{passwordStrength.label || "Start typing"}</strong>
                </div>
                <div className="auth-password-meter" aria-hidden="true">
                  {[1, 2, 3, 4].map((segment) => (
                    <span className={segment <= passwordStrength.score ? "is-active" : ""} key={segment} />
                  ))}
                </div>
                <ul>
                  {passwordStrength.requirements.map((requirement) => (
                    <li className={requirement.met ? "is-met" : ""} key={requirement.key}>
                      <span aria-hidden="true">{requirement.met ? "✓" : "·"}</span>
                      {requirement.label}
                    </li>
                  ))}
                </ul>
              </div>
            </label>
            <label className="dashboard-profile-full-field">
              <span>Confirm new password</span>
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                aria-describedby="reset-password-match"
                aria-invalid={mismatch || undefined}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
              <small
                className={`auth-password-match${matches ? " is-match" : mismatch ? " is-mismatch" : ""}`}
                id="reset-password-match"
                aria-live="polite"
              >
                {matches
                  ? "Passwords match."
                  : mismatch
                    ? "Passwords do not match yet."
                    : "Re-enter your password."}
              </small>
            </label>
          </div>
          {state.message && (
            <p
              className={`dashboard-security-message auth-message auth-message-${state.status}`}
              role={state.status === "error" ? "alert" : "status"}
            >
              {state.message}
            </p>
          )}
          <div className="dashboard-profile-actions">
            <p>You will be signed out everywhere after the password is changed.</p>
            <button
              type="submit"
              disabled={pending || !passwordStrength.isValid || !matches}
            >
              {pending ? "Updating…" : "Update password"} <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
