import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AuthForm } from "@/app/auth/auth-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link href="/" aria-label="Return to the GDG UTD homepage">
          <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} priority />
        </Link>
        <Link href="/">Back home</Link>
      </header>
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
