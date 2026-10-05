import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { applicantStatus, formatCentralDate } from "@/lib/applications";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{ submitted?: string; admin?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) redirect("/login");

  const userId = data.claims.sub;
  const [{ data: applications }, { data: admin }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, opening_id, submission_state, submitted_at, published_decision, decision_published_at, updated_at, application_openings(slug, title, eyebrow, accent)")
      .eq("applicant_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("application_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return (
    <main className="dashboard-page">
      <header className="auth-header">
        <Link href="/" aria-label="Return to the GDG UTD homepage">
          <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} loading="eager" />
        </Link>
        <Link href="/">Back home</Link>
      </header>
      <section className="dashboard-shell">
        <div className="dashboard-heading">
          <div>
            <p className="section-label">Member area</p>
            <h1>Dashboard</h1>
            <p>Track your GDG UTDallas applications here.</p>
          </div>
          <div className="dashboard-heading-actions">
            {admin && <Link className="dashboard-admin-link" href="/admin/applications">Application portal</Link>}
            <form action={logout}>
              <button className="account-logout" type="submit">Log out</button>
            </form>
          </div>
        </div>

        {query.submitted && (
          <p className="dashboard-notice" role="status"><span aria-hidden="true">✓</span>Your application was submitted.</p>
        )}
        {query.admin === "denied" && (
          <p className="dashboard-notice dashboard-notice-error" role="status">You do not have access to the application portal.</p>
        )}

        <div className="dashboard-section-heading">
          <h2>Your applications</h2>
          <Link href="/apply">View open positions <span aria-hidden="true">→</span></Link>
        </div>

        {applications && applications.length > 0 ? (
          <div className="dashboard-applications">
            {applications.map((application) => {
              const opening = application.application_openings;
              const status = applicantStatus(application.submission_state, application.published_decision);
              return (
                <article className={`dashboard-application dashboard-application-${opening?.accent ?? "blue"}`} key={application.id}>
                  <div>
                    <p>{opening?.eyebrow ?? "Application"}</p>
                    <h3>{opening?.title ?? "SPRINT application"}</h3>
                  </div>
                  <div className="dashboard-application-meta">
                    <span className={`application-status application-status-${status.toLowerCase().replace(" ", "-")}`}>{status}</span>
                    <p>{application.submission_state === "draft" ? "Last saved" : application.decision_published_at ? "Decision posted" : "Submitted"}</p>
                    <time>{formatCentralDate(application.decision_published_at ?? application.submitted_at ?? application.updated_at)} CT</time>
                  </div>
                  {application.submission_state === "draft" ? (
                    <Link href={`/apply/${opening?.slug ?? ""}`}>Continue application <span aria-hidden="true">→</span></Link>
                  ) : (
                    <p className="dashboard-application-note">
                      {status === "Submitted"
                        ? "Your application is under review. Updates will appear here."
                        : status === "Accepted"
                          ? "You have been selected. The team will share next steps with you."
                          : "Thank you for applying and for your interest in SPRINT."}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="dashboard-empty-state">
            <h3>No applications yet.</h3>
            <p>Open applications will appear here after you save or submit one.</p>
            <Link className="primary-link" href="/apply">View applications <span aria-hidden="true">→</span></Link>
          </div>
        )}
      </section>
    </main>
  );
}
