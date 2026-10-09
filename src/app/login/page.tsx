import type { Metadata } from "next";
import Image from "next/image";
import { AuthForm } from "@/app/auth/auth-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Log in" };

type LoginPageProps = { searchParams: Promise<{ next?: string }> };

function safeNextPath(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  return (
    <main className="auth-page">
      <SiteHeader />
      <section className="auth-layout">
        <div className="auth-copy">
          <div>
            <p className="section-label">Member account</p>
            <h1>Welcome back.</h1>
            <p>Log in to access your GDG UTDallas account.</p>
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
            <h2>Log in</h2>
          </div>
          <AuthForm mode="login" nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
