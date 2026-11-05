"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function EmailReportShell({ days, children }: { days: number; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [requestedDays, setRequestedDays] = useState(days);

  function changePeriod(nextDays: number) {
    if (nextDays === days || pending) return;
    setRequestedDays(nextDays);
    startTransition(() => router.push(`/admin/email-health?days=${nextDays}`, { scroll: false }));
  }

  return <>
    <nav className="email-period" aria-label="Reporting period">
      {[7, 30].map(value => <button key={value} type="button" aria-pressed={(pending ? requestedDays : days) === value} disabled={pending} onClick={() => changePeriod(value)}>Last {value} days</button>)}
    </nav>
    <div aria-busy={pending}>
      {pending && <div className="email-panel email-report-loading" role="status">
        <span className="email-loading-spinner" aria-hidden="true" />
        <h2>Loading {requestedDays}-day email report…</h2>
        <p>Updating usage and delivery data.</p>
        <div className="email-loading-cards" aria-hidden="true">{[0, 1, 2, 3].map(i => <span key={i} />)}</div>
      </div>}
      <div hidden={pending}>{children}</div>
    </div>
  </>;
}
