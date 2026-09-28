import type { Metadata } from "next";
import Image from "next/image";
import { AuthForm } from "@/app/auth/auth-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
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
            src="/illustrations/teamwork.svg"
            alt="An illustration of a team collaborating"
            width={780}
            height={560}
            priority
          />
        </div>
        <div className="auth-panel">
          <div className="auth-panel-heading">
            <p>Create an account</p>
            <h2>Sign up</h2>
          </div>
          <AuthForm mode="signup" />
        </div>
      </section>
    </main>
  );
}
