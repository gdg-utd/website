import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AuthForm } from "@/app/auth/auth-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link href="/" aria-label="Return to the GDG UTD homepage">
          <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} priority />
        </Link>
        <Link href="/">Back home</Link>
      </header>
      <section className="auth-layout">
        <div className="auth-copy">
          <div>
            <p className="section-label">Member account</p>
            <h1>Welcome back.</h1>
            <p>Log in to access your GDG UTDallas account.</p>
          </div>
          <Image
            src="/illustrations/education.svg"
            alt="An illustration of students learning together"
            width={780}
            height={560}
            priority
          />
        </div>
        <div className="auth-panel">
          <div className="auth-panel-heading">
            <p>Account access</p>
            <h2>Log in</h2>
          </div>
          <AuthForm mode="login" />
        </div>
      </section>
    </main>
  );
}
