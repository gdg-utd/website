"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { getPasswordStrength } from "@/lib/password";
import {
  changePassword,
  recoverPassword,
  type PasswordActionState,
} from "@/app/dashboard/profile/password-actions";

const initialState: PasswordActionState = { status: "idle", message: "" };

export function PasswordForm({ mode }: { mode: "profile" | "recovery" }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [state, formAction, pending] = useActionState(
    mode === "profile" ? changePassword : recoverPassword,
    initialState,
  );
  const strength = getPasswordStrength(password);
  const matches = confirmation.length > 0 && password === confirmation;
  return (
    <form className="auth-form password-form" action={formAction}>
      {mode === "profile" && (
        <label>
          <span>Current password</span>
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
      )}
      <label>
        <span id="new-password-label">New password</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-labelledby="new-password-label"
          aria-describedby="new-password-help"
        />
      </label>
      <div
        id="new-password-help"
        className={`auth-password-strength auth-password-strength-${strength.score}`}
      >
        <div className="auth-password-strength-heading">
          <span>Password strength</span>
          <strong>{strength.label || "Start typing"}</strong>
        </div>
        <div className="auth-password-meter" aria-hidden="true">
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              className={segment <= strength.score ? "is-active" : ""}
            />
          ))}
        </div>
        <ul>
          {strength.requirements.map((rule) => (
            <li key={rule.key} className={rule.met ? "is-met" : ""}>
              <span aria-hidden="true">{rule.met ? "✓" : "·"}</span>
              {rule.label}
            </li>
          ))}
        </ul>
      </div>
      <label>
        <span id="confirm-password-label">Confirm new password</span>
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          aria-labelledby="confirm-password-label"
          aria-describedby="new-password-match"
          aria-invalid={(confirmation.length > 0 && !matches) || undefined}
        />
        <small
          className={`auth-password-match${matches ? " is-match" : confirmation ? " is-mismatch" : ""}`}
          id="new-password-match"
        >
          {matches
            ? "Passwords match."
            : confirmation
              ? "Passwords do not match yet."
              : "Re-enter your password."}
        </small>
      </label>
      {state.message && (
        <p className="auth-message auth-message-error" role="alert">
          {state.message}
        </p>
      )}
      <p className="password-form-note">
        {mode === "profile"
          ? "You’ll return to your profile after saving. Other sessions will be signed out."
          : "After resetting, you’ll log in again with your new password."}
      </p>
      <button
        className="auth-submit"
        type="submit"
        disabled={pending || !strength.isValid || !matches}
      >
        {pending ? "Updating…" : "Update password"}
        <span aria-hidden="true">→</span>
      </button>
      <Link
        className="auth-switch"
        href={mode === "profile" ? "/dashboard/profile" : "/login?forgot=1"}
      >
        {mode === "profile"
          ? "Cancel and return to profile"
          : "Request a new reset link"}
      </Link>
    </form>
  );
}
