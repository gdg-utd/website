import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function PageStateShell({ children, embedded = false }: { children: ReactNode; embedded?: boolean }) {
  if (embedded) return <section className="page-state page-state-embedded">{children}</section>;
  return (
    <div className="page-state-shell">
      <header className="header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="GDG on Campus UTD home">
            <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} priority />
            <span>The University of Texas at Dallas</span>
          </Link>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="page-state">{children}</main>
    </div>
  );
}
