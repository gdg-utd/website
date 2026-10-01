import Image from "next/image";
import Link from "next/link";
import { CHAPTER_URL } from "@/lib/gdg";
import { createClient } from "@/lib/supabase/server";

type SiteHeaderProps = {
  isSignedIn?: boolean;
};

export async function SiteHeader({ isSignedIn: suppliedAuthState }: SiteHeaderProps = {}) {
  let isSignedIn = suppliedAuthState;

  if (isSignedIn === undefined) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    isSignedIn = Boolean(data?.claims?.sub);
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link className="brand" href="/#top" aria-label="GDG on Campus UTD home">
          <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} loading="eager" />
          <span>The University of Texas at Dallas</span>
        </Link>
        <nav className="nav" aria-label="Primary navigation">
          <Link href="/about">About</Link>
          <Link href="/officers">Officers</Link>
          <Link href="/apply">Apply</Link>
          <Link href="/#events">Events</Link>
        </nav>
        <a className="chapter-link" href={CHAPTER_URL} target="_blank" rel="noreferrer">Join chapter ↗</a>
        {isSignedIn ? (
          <Link className="header-action dashboard-link" href="/dashboard">Dashboard</Link>
        ) : (
          <div className="auth-links">
            <Link className="login-link" href="/login">Log in</Link>
            <Link className="header-action" href="/signup">Sign up</Link>
          </div>
        )}
        <details className="mobile-nav">
          <summary>Menu</summary>
          <nav aria-label="Mobile navigation">
            <Link href="/about">About</Link>
            <Link href="/officers">Officers</Link>
            <Link href="/apply">Apply</Link>
            <Link href="/#events">Events</Link>
            <a href={CHAPTER_URL} target="_blank" rel="noreferrer">Join chapter ↗</a>
            {isSignedIn ? (
              <Link href="/dashboard">Dashboard</Link>
            ) : (
              <>
                <Link href="/login">Log in</Link>
                <Link href="/signup">Sign up</Link>
              </>
            )}
          </nav>
        </details>
      </div>
    </header>
  );
}
