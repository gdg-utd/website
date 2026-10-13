import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="not-found-shell">
      <header className="header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="GDG on Campus UTD home">
            <Image
              src="/brand/gdg-lockup.svg"
              alt="Google Developer Groups"
              width={188}
              height={38}
              priority
            />
            <span>The University of Texas at Dallas</span>
          </Link>
        </div>
      </header>

      <main className="not-found-page" aria-labelledby="not-found-title">
        <Image
          src="/illustrations/not-found-lost-gps.svg"
          alt="A lost traveler checking a GPS that shows a 404 error"
          width={683}
          height={490}
          priority
        />
        <h1 id="not-found-title">We can’t find that page.</h1>
        <Link className="primary-button not-found-home" href="/">
          Back to home
        </Link>
      </main>
    </div>
  );
}
