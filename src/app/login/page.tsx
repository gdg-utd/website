import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
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
        <h1>Log in</h1>
        <p>The website&apos;s member authentication will be added here.</p>
        <Link href="/signup">Need an account? Sign up</Link>
      </section>
    </main>
  );
}
