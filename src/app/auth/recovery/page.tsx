import type { Metadata } from "next";
import Link from "next/link";
import { normalizeQuery, safeNextPath } from "@/lib/navigation";
import { ConfirmRecovery } from "./confirm-recovery";

export const metadata: Metadata = {
  title: "Continue password reset",
  referrer: "no-referrer",
};

export default async function RecoveryConfirmation({ searchParams }: {
  searchParams: Promise<{ token_hash?: string | string[]; next?: string | string[] }>;
}) {
  const query = normalizeQuery(await searchParams);
  const token = query.token_hash ?? "";
  const next = safeNextPath(query.next);
  return (
    <main id="main-content" tabIndex={-1} className="password-recovery-page">
      <section className="password-recovery-card">
        <p className="section-label">Account security</p>
        <h1>{token && token.length <= 512 ? "Continue to reset your password." : "Reset link unavailable"}</h1>
        {token && token.length <= 512 ? (
          <>
            <p>Continue to open the secure password reset form.</p>
            <ConfirmRecovery token={token} nextPath={next} />
          </>
        ) : (
          <Link className="primary-link" href={`/login?forgot=1${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`}>Request a reset link</Link>
        )}
      </section>
    </main>
  );
}
