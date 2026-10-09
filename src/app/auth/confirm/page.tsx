import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ConfirmationForm } from "./confirmation-form";

export const metadata: Metadata = { title: "Confirm email" };

type ConfirmEmailPageProps = {
  searchParams: Promise<{
    email?: string;
    next?: string;
  }>;
};

function safeNextPath(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : "/?auth=confirmed";
}

export default async function ConfirmEmailPage({
  searchParams,
}: ConfirmEmailPageProps) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
  const next = safeNextPath(params.next);
  const hasValidEmail = /^[^@\s]+@utdallas\.edu$/i.test(email);

  return (
    <main className="auth-page">
      <SiteHeader />
      <section className="email-confirm-layout" aria-labelledby="email-confirm-title">
        <div className="email-confirm-card">
          <p className="section-label">Account verification</p>
          <h1 id="email-confirm-title">
            {hasValidEmail ? "Enter your confirmation code." : "Confirmation details unavailable."}
          </h1>
          <p>
            {hasValidEmail ? (
              <>
                We sent a six-digit code to <strong>{email}</strong>. It may take a few
                minutes to arrive, and you may need to check your junk folder.
              </>
            ) : (
              "Return to sign up and request a new confirmation code."
            )}
          </p>

          {hasValidEmail ? (
            <ConfirmationForm email={email} nextPath={next} />
          ) : (
            <Link className="email-confirm-link" href="/signup">
              Return to sign up <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
