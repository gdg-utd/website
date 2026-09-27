import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <main className="subpage">
      <header className="subpage-header">
        <Link href="/" aria-label="Return to the GDG UTD homepage">
          <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} priority />
        </Link>
        <Link href="/">Back home</Link>
      </header>
      <section className="subpage-content auth-placeholder">
        <p className="section-label">Member account</p>
        <h1>Sign up</h1>
        <p>Member registration will be added here with the authentication backend.</p>
        <Link href="/login">Already have an account? Log in</Link>
      </section>
    </main>
  );
}
