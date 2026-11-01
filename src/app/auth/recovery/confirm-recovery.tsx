"use client";

import { useFormStatus } from "react-dom";
import { confirmRecovery } from "./actions";

function ContinueButton() {
  const { pending } = useFormStatus();
  return <button className="auth-submit" disabled={pending}>{pending ? "Opening reset form…" : "Continue to reset password"}</button>;
}

export function ConfirmRecovery({ token, nextPath }: { token: string; nextPath: string }) {
  return (
    <form className="auth-form" action={confirmRecovery}>
      <input type="hidden" name="tokenHash" value={token} />
      <input type="hidden" name="next" value={nextPath} />
      <ContinueButton />
    </form>
  );
}
