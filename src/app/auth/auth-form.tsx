"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  login,
  signup,
  type AuthActionState,
} from "./actions";

type AuthFormProps = {
  mode: "login" | "signup";
  nextPath?: string;
};

export function AuthForm({ mode, nextPath = "/" }: AuthFormProps) {
  const [signupEmail, setSignupEmail] = useState("");
  const initialAuthState: AuthActionState = {
    status: "idle",
    message: "",
  };
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    action,
    initialAuthState,
  );
  const isSignup = mode === "signup";
  const emailValue = signupEmail.trim();
  const emailStatus = emailValue.length === 0
    ? "idle"
    : /^[^@\s]+@utdallas\.edu$/i.test(emailValue)
      ? "valid"
      : "invalid";

  return (
    <form className="auth-form" action={formAction}>
      <input type="hidden" name="next" value={nextPath} />
      {isSignup && (
        <div className="auth-name-fields">
          <label>
            <span>First name</span>
            <input
              name="firstName"
              type="text"
              autoComplete="given-name"
              maxLength={50}
              required
            />
          </label>
          <label>
            <span>Last name</span>
            <input
              name="lastName"
              type="text"
              autoComplete="family-name"
              maxLength={50}
              required
            />
          </label>
        </div>
      )}

      <label>
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          pattern={isSignup ? "[^@\\s]+@[uU][tT][dD][aA][lL][lL][aA][sS]\\.[eE][dD][uU]" : undefined}
          title={isSignup ? "Use an email ending in @utdallas.edu" : undefined}
          aria-describedby={isSignup ? "signup-email-help" : undefined}
          aria-invalid={isSignup && emailStatus === "invalid" ? true : undefined}
          placeholder={isSignup ? "dal123456@utdallas.edu" : undefined}
          value={isSignup ? signupEmail : undefined}
          onChange={isSignup ? (event) => setSignupEmail(event.target.value) : undefined}
          required
        />
        {isSignup && (
          <span
            className={`auth-email-status auth-email-status-${emailStatus}`}
            id="signup-email-help"
            aria-live="polite"
          >
            {emailStatus !== "idle" && (
              <span className="auth-email-status-icon" aria-hidden="true">
                {emailStatus === "valid" ? "✓" : "!"}
              </span>
            )}
            <small>
              {emailStatus === "valid"
                ? "Valid UT Dallas email format."
                : emailStatus === "invalid"
                  ? "Enter an email ending in @utdallas.edu."
                  : "Use your UT Dallas email, for example dal123456@utdallas.edu."}
            </small>
          </span>
        )}
      </label>

      <label>
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={8}
          required
        />
      </label>

      {isSignup && (
        <label>
          <span>Confirm password</span>
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
      )}

      {state.message && (
        <p className={`auth-message auth-message-${state.status}`} role="status">
          {state.message}
        </p>
      )}

      <button className="auth-submit" type="submit" disabled={pending}>
        {pending
          ? isSignup ? "Creating account…" : "Logging in…"
          : isSignup ? "Create account" : "Log in"}
        <span aria-hidden="true">→</span>
      </button>

      <p className="auth-switch">
        {isSignup ? "Already have an account?" : "New to GDG UTDallas?"}{" "}
        <Link href={`${isSignup ? "/login" : "/signup"}${nextPath !== "/" ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>
          {isSignup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
