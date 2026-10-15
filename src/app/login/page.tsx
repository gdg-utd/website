import type { Metadata } from "next";
import Image from "next/image";
import { AuthForm } from "@/app/auth/auth-form";
import { ForgotPasswordForm } from "@/app/auth/forgot-password-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    forgot?: string;
    next?: string;
    password?: string;
  }>;
};

function safeNextPath(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, forgot, next, password } = await searchParams;
  const nextPath = safeNextPath(next);
  const isForgotPassword = forgot === "1";
  return (
    <main className="auth-page">
      <SiteHeader />
      <section className="auth-layout">
        <div className="auth-copy">
          <div>
            <p className="section-label">Member account</p>
            <h1>{isForgotPassword ? "Let’s get you back in." : "Welcome back."}</h1>
            <p>
              {isForgotPassword
                ? "Enter the UT Dallas email connected to your account and we’ll send a secure reset link."
                : "Log in to access your GDG UTDallas account."}
            </p>
          </div>
          <Image
            src="/illustrations/productive-work.svg"
            alt="A hand-drawn illustration of a person checking work on a phone"
            width={608}
            height={520}
            loading="eager"
          />
        </div>
        <div className="auth-panel">
          <div className="auth-panel-heading">
            <p>Account access</p>
            <h2>{isForgotPassword ? "Reset password" : "Log in"}</h2>
          </div>
          {password === "updated" && (
            <p className="auth-message auth-message-success auth-page-message" role="status">
              Your password was updated. Enter the new password you just chose; your browser may still have the old one saved.
            </p>
          )}
          {error === "recovery" && isForgotPassword && (
            <p className="auth-message auth-message-error auth-page-message" role="alert">
              That reset link is invalid or has expired. Request a new one below.
            </p>
          )}
          {isForgotPassword ? (
            <ForgotPasswordForm />
          ) : (
            <AuthForm mode="login" nextPath={nextPath} />
          )}
        </div>
      </section>
    </main>
  );
}
