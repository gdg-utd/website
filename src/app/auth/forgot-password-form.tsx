"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordReset,
  type ForgotPasswordActionState,
} from "./actions";

const initialState: ForgotPasswordActionState = {
  status: "idle",
  message: "",
};

export function ForgotPasswordForm({ nextPath = "/" }: { nextPath?: string }) {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  return (
    <form className="auth-form" action={formAction}>
      <input type="hidden" name="next" value={nextPath} />
      <label>
        <span>UT Dallas email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          pattern="[^@\s]+@[uU][tT][dD][aA][lL][lL][aA][sS]\.[eE][dD][uU]"
          title="Use the UT Dallas email connected to your account"
          placeholder="dal123456@utdallas.edu"
          required
          autoFocus
        />
      </label>

      {state.message && (
        <p
          className={`auth-message auth-message-${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      )}

      <button className="auth-submit" type="submit" disabled={pending}>
        {pending ? "Sending reset link…" : "Send reset link"}
        <span aria-hidden="true">→</span>
      </button>

      <p className="auth-switch">
        Remembered your password? <Link href={nextPath === "/" ? "/login" : `/login?next=${encodeURIComponent(nextPath)}`}>Return to log in</Link>
      </p>
    </form>
  );
}
