import type { Metadata } from "next";
import Image from "next/image";
import { AuthForm } from "@/app/auth/auth-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Sign up" };

type SignupPageProps = { searchParams: Promise<{ next?: string }> };

function safeNextPath(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  return (
    <main className="auth-page">
      <SiteHeader />
      <section className="auth-layout auth-layout-signup">
        <div className="auth-copy">
          <div>
            <p className="section-label">Member account</p>
            <h1>Join the community.</h1>
            <p>Create an account for GDG UTDallas programs and resources.</p>
          </div>
          <Image
            src="/illustrations/productive-success.svg"
            alt="A hand-drawn illustration celebrating a job well done"
            width={608}
            height={520}
            loading="eager"
          />
        </div>
        <div className="auth-panel">
          <div className="auth-panel-heading">
            <p>Create an account</p>
            <h2>Sign up</h2>
          </div>
          <AuthForm mode="signup" nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
