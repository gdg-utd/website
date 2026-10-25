import { normalizeQuery } from "@/lib/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DISCORD_URL, INSTAGRAM_URL, LINKTREE_URL } from "@/lib/gdg";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

type DashboardPageProps = {
  searchParams: Promise<{ admin?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const query = normalizeQuery(await searchParams);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) redirect("/login?next=/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("id", userId)
    .maybeSingle();

  const firstName = profile?.first_name || "there";
  const configuredSupportEmail = process.env.BREVO_REPLY_TO || process.env.BREVO_SENDER_EMAIL || "";
  const supportEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(configuredSupportEmail) ? configuredSupportEmail : null;

  return (
    <>
      {query.admin === "denied" && (
        <p className="dashboard-notice dashboard-notice-error" role="status">You do not have access to the application portal.</p>
      )}

      <section className="dashboard-welcome-card">
        <p className="section-label">Applicant dashboard</p>
        <h1>Welcome, {firstName}.</h1>
        <p>Manage your GDG UTDallas profile and keep up with your applications in one place.</p>
        <div className="dashboard-welcome-actions">
          <Link className="dashboard-action-pill" href="/dashboard/applications">View your applications <span aria-hidden="true">→</span></Link>
          <Link className="dashboard-action-pill dashboard-action-pill-secondary" href="/apply/sprint-mentee">Join cohort <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="dashboard-help-card">
        <div>
          <p className="section-label">Need help?</p>
          <h2>Connect with GDG UTDallas.</h2>
          <p>Ask a question, meet the community, or find the latest chapter updates.</p>
        </div>
        <nav aria-label="GDG UTDallas help links">
          {supportEmail && <a href={`mailto:${supportEmail}`}>Email us <span aria-hidden="true">→</span></a>}
          <a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord <span aria-hidden="true">↗</span></a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">Instagram <span aria-hidden="true">↗</span></a>
          <a href={LINKTREE_URL} target="_blank" rel="noreferrer">All chapter links <span aria-hidden="true">↗</span></a>
        </nav>
      </section>
    </>
  );
}
