import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { confirmEmail } from "./actions";

export const metadata: Metadata = { title: "Confirm email" };

type ConfirmEmailPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
    token_hash?: string;
    type?: string;
  }>;
};

export default async function ConfirmEmailPage({
  searchParams,
}: ConfirmEmailPageProps) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const type = typeof params.type === "string" ? params.type : "";
  const next = typeof params.next === "string" ? params.next : "/?auth=confirmed";
  const isInvalid = params.error === "invalid" || !tokenHash || type !== "email";

  return (
    <main className="auth-page">
      <SiteHeader />
      <section className="email-confirm-layout" aria-labelledby="email-confirm-title">
        <div className="email-confirm-card">
          <span className="email-confirm-mark" aria-hidden="true">
            {isInvalid ? "!" : "✓"}
          </span>
          <p className="section-label">Account verification</p>
          <h1 id="email-confirm-title">
            {isInvalid ? "This confirmation link is unavailable." : "Confirm your email address."}
          </h1>
          <p>
            {isInvalid
              ? "The link may have expired or already been used. Return to login and try again with a new confirmation email."
              : "Email providers sometimes inspect links automatically. Confirm below to finish creating your GDG UTDallas account."}
          </p>

          {isInvalid ? (
            <Link className="email-confirm-link" href="/login">
              Return to login <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <form action={confirmEmail}>
              <input type="hidden" name="tokenHash" value={tokenHash} />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="next" value={next} />
              <button className="auth-submit" type="submit">
                Confirm and continue <span aria-hidden="true">→</span>
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
