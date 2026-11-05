import type { Metadata } from "next";
import { requireApplicationAdmin } from "@/lib/application-admin";
import type { EmailHealth } from "@/lib/email-health";
import { EmailReportShell } from "./report-shell";
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

      <div id="main-content" tabIndex={-1} className="admin-shell">
        <div className="admin-title-row">
          <div><p className="section-label">Internal portal · Administrator</p><h1>Email health</h1><p>Usage, delivery, and emails that need your attention.</p></div>
          <div className="admin-title-actions"><RefreshEmailHealth /><a className="admin-export" href="https://app.brevo.com/" target="_blank" rel="noreferrer">Open Brevo ↗</a></div>
        </div>
        <EmailReportShell days={days}>
        {error || !data ? <section className="email-panel"><h2>Reporting unavailable</h2><p>We couldn’t load email health. Try refreshing. If this is the first setup, the email reporting service must be deployed before live data is available.</p></section> : <EmailHealthOverview data={data} />}
        </EmailReportShell>
      </div>
    </main>
  );
}
