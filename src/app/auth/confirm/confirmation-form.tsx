"use client";

import { useActionState, useEffect, useState } from "react";
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

const resendCooldownMilliseconds = 2 * 60 * 1000;

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export function ConfirmationForm({ email, nextPath }: ConfirmationFormProps) {
  const [code, setCode] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(120);
  const [verifyState, verifyAction, verifying] = useActionState(
    confirmEmailCode,
    initialState,
  );
  const resendStorageKey = `gdg-confirm-resend:${email}`;

  useEffect(() => {
    const initializeCooldown = window.setTimeout(() => {
      const savedValue = window.sessionStorage.getItem(resendStorageKey);
      const savedCooldown = Number(savedValue);
      const initialCooldown =
        savedValue !== null && Number.isFinite(savedCooldown)
          ? savedCooldown
          : Date.now() + resendCooldownMilliseconds;

      window.sessionStorage.setItem(resendStorageKey, String(initialCooldown));
      setCooldownUntil(initialCooldown);
    }, 0);

    return () => window.clearTimeout(initializeCooldown);
  }, [resendStorageKey]);

  useEffect(() => {
    if (cooldownUntil === null) return;

    const updateCountdown = () => {
      setRemainingSeconds(
        Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)),
      );
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [cooldownUntil]);

  function restartResendCooldown() {
    const nextCooldown = Date.now() + resendCooldownMilliseconds;
    window.sessionStorage.setItem(resendStorageKey, String(nextCooldown));
    setCooldownUntil(nextCooldown);
    setRemainingSeconds(120);
  }
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
            aria-label="Six-digit email confirmation code"
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

      <form
        className="email-confirm-resend"
        action={resendAction}
        onSubmit={restartResendCooldown}
      >
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={nextPath} />
        <p>Didn&apos;t receive a code?</p>
        <button type="submit" disabled={resending || remainingSeconds > 0}>
          {resending
            ? "Sending…"
            : remainingSeconds > 0
              ? `Send a new code in ${formatCountdown(remainingSeconds)}`
              : "Send a new code"}
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
