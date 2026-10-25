import { canRecoverPassword } from "@/lib/password-recovery";
import type { Metadata } from "next";
import Link from "next/link";
import { PasswordForm } from "@/components/password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const { data: claims } = await supabase.auth.getClaims();
  const sessionId = claims?.claims?.session_id;
  const allowed =
    !error &&
    data.user &&
    typeof sessionId === "string" &&
    (await canRecoverPassword(data.user.id, sessionId));
  return (
    <main id="main-content" tabIndex={-1} className="password-recovery-page">
      <section className="password-recovery-card">
        <p className="section-label">Account security</p>
        <h1>{!allowed ? "Reset link unavailable" : "Reset your password"}</h1>
        {!allowed ? (
          <>
            <p>
              Your reset link is invalid or has expired. Request a new link to
              continue.
            </p>
            <Link className="primary-link" href="/login?forgot=1">
              Request a reset link <span aria-hidden="true">→</span>
            </Link>
          </>
        ) : (
          <>
            <p>
              Choose a new password for <strong>{data.user.email}</strong>.
            </p>
            <PasswordForm mode="recovery" />
          </>
        )}
      </section>
    </main>
  );
}
