import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireApplicationAdmin } from "@/lib/application-admin";
import type { EmailHealth } from "@/lib/email-health";
import { RefreshEmailHealth } from "./refresh";
import { EmailHealthOverview } from "./overview";

export const metadata: Metadata = { title: "Email health" };
export const dynamic = "force-dynamic";

export default async function EmailHealthPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { supabase } = await requireApplicationAdmin("/admin/email-health");
  const days = (await searchParams).days === "30" ? 30 : 7;
  const { data, error } = await supabase.functions.invoke<EmailHealth>("email-health", { body: { days } });
  return (
    <main className="admin-page email-health-page">
      <header className="admin-header">
        <Link href="/" aria-label="Return to the GDG UTD homepage"><Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} /></Link>
        <nav aria-label="Admin navigation"><Link href="/dashboard">Dashboard</Link><Link href="/admin/applications">Applications</Link><Link href="/admin/email-health" aria-current="page">Email health</Link></nav>
      </header>
      <div id="main-content" tabIndex={-1} className="admin-shell">
        <div className="admin-title-row">
          <div><p className="section-label">Internal portal · Administrator</p><h1>Email health</h1><p>Usage, delivery, and emails that need your attention.</p></div>
          <div className="admin-title-actions"><RefreshEmailHealth /><a className="admin-export" href="https://app.brevo.com/" target="_blank" rel="noreferrer">Open Brevo ↗</a></div>
        </div>
        <nav className="email-period" aria-label="Reporting period">{[7, 30].map(n => <Link key={n} href={`?days=${n}`} prefetch={false} aria-current={days === n ? "page" : undefined}>Last {n} days</Link>)}</nav>
        {error || !data ? <section className="email-panel"><h2>Reporting unavailable</h2><p>We couldn’t load email health. Try refreshing. If this is the first setup, the email reporting service must be deployed before live data is available.</p></section> : <EmailHealthOverview data={data} />}
      </div>
    </main>
  );
}
