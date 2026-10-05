"use client";

import { useActionState, useState } from "react";
import {
  confirmEmailCode,
  resendConfirmationCode,
  type ConfirmationActionState,
} from "./actions";

type ConfirmationFormProps = {
  email: string;
  nextPath: string;
};

const initialState: ConfirmationActionState = {
  status: "idle",
  message: "",
};

export function ConfirmationForm({ email, nextPath }: ConfirmationFormProps) {
  const [code, setCode] = useState("");
  const [verifyState, verifyAction, verifying] = useActionState(
    confirmEmailCode,
    initialState,
  );
  const [resendState, resendAction, resending] = useActionState(
    resendConfirmationCode,
    initialState,
  );

  return (
    <div className="email-confirm-actions">
      <form className="auth-form email-confirm-form" action={verifyAction}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={nextPath} />
        <label>
          <span>Six-digit code</span>
          <input
            className="email-confirm-code"
            name="token"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            placeholder="000000"
            aria-label="Six-digit confirmation code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
            }}
            required
            autoFocus
          />
        </label>

        {verifyState.message && (
          <p className={`auth-message auth-message-${verifyState.status}`} role="status">
            {verifyState.message}
          </p>
        )}

        <button className="auth-submit" type="submit" disabled={verifying || code.length !== 6}>
          {verifying ? "Confirming…" : "Confirm email"}
          <span aria-hidden="true">→</span>
        </button>
      </form>

      <form className="email-confirm-resend" action={resendAction}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={nextPath} />
        <p>Didn&apos;t receive a code?</p>
        <button type="submit" disabled={resending}>
          {resending ? "Sending…" : "Send a new code"}
        </button>
      </form>

      {resendState.message && (
        <p className={`auth-message auth-message-${resendState.status}`} role="status">
          {resendState.message}
        </p>
      )}
    </div>
  );
}
