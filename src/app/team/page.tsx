import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Meet the team",
  description: "Meet the organizers behind GDG on Campus UTD.",
};

export default function TeamPage() {
  return (
    <main className="subpage">
      <header className="subpage-header">
        <Link href="/" aria-label="Return to the GDG UTD homepage">
          <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} priority />
        </Link>
        <Link href="/">Back home</Link>
      </header>
      <section className="subpage-content">
        <p className="section-label">GDG on Campus · UTD</p>
        <h1>Meet the team</h1>
        <p>Team profiles will be added here.</p>
      </section>
    </main>
  );
}
