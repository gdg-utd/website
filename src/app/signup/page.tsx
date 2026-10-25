import { normalizeQuery, safeNextPath } from "@/lib/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { AuthForm } from "@/app/auth/auth-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
};

type SignupPageProps = { searchParams: Promise<{ next?: string }> };


export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { next } = normalizeQuery(await searchParams);
  const nextPath = safeNextPath(next);
  return (
    <main className="auth-page">
      <SiteHeader />
      <section id="main-content" tabIndex={-1} className="auth-layout auth-layout-signup">
        <div className="auth-copy">
          <div>
            <p className="section-label">Member account</p>
            <h1>Join the community.</h1>
            <p>Create an account for GDG UTDallas programs and resources.</p>
          </div>
          <Image
            src="/illustrations/productive-progress.svg"
            alt="A hand-drawn illustration of a person completing a set of tasks"
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
