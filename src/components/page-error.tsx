"use client";

import Link from "next/link";
import { useTransition } from "react";
import { PageStateShell } from "./page-state-shell";

export function PageError({ retry, embedded = false, href = "/", linkLabel = "Back to home" }: {
  retry: () => void;
  embedded?: boolean;
  href?: string;
  linkLabel?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <PageStateShell embedded={embedded}>
      <div role="alert">
        <p className="section-label">Something went wrong</p>
        <h1>This page couldn’t load.</h1>
        <p>Please try again. If this keeps happening, come back later.</p>
        <div className="page-state-actions">
          <button className="primary-button" type="button" disabled={pending} onClick={() => startTransition(retry)}>
            {pending ? "Trying again…" : "Try again"}
          </button>
          <Link className="secondary-link" href={href}>{linkLabel}</Link>
        </div>
      </div>
    </PageStateShell>
  );
}
