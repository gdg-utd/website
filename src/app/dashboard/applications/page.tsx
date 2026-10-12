import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { applicantStatus, formatCentralDate } from "@/lib/applications";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your applications" };

type ApplicationsPageProps = {
  searchParams: Promise<{ submitted?: string }>;
};

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) redirect("/login?next=/dashboard/applications");

  const { data: applications } = await supabase
    .from("applications")
    .select("id, opening_id, submission_state, submitted_at, published_decision, decision_published_at, updated_at, application_openings(slug, title, eyebrow, accent)")
    .eq("applicant_id", userId)
    .order("updated_at", { ascending: false });

  return (
    <>
      <header className="dashboard-page-heading">
        <div>
          <p className="section-label">Your progress</p>
          <h1>Applications</h1>
          <p>Continue drafts and view updates on submitted applications.</p>
        </div>
        <Link className="dashboard-heading-link" href="/apply">View open positions <span aria-hidden="true">→</span></Link>
      </header>

      {query.submitted && (
        <p className="dashboard-notice" role="status"><span aria-hidden="true">✓</span>Your application was submitted.</p>
      )}

      {applications && applications.length > 0 ? (
        <div className="dashboard-applications">
          {applications.map((application) => {
            const opening = application.application_openings;
            const status = applicantStatus(application.submission_state, application.published_decision);
            return (
              <article className={`dashboard-application dashboard-application-${opening?.accent ?? "blue"}`} key={application.id}>
                <div>
                  <p>{opening?.eyebrow ?? "Application"}</p>
                  <h2>{opening?.title ?? "GDG UTDallas application"}</h2>
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
                      ? "Your application is under review. Updates will appear here and be sent to your email."
                      : status === "Accepted"
                        ? "You have been selected. Check your email for next steps."
                        : "Thank you for applying and for your interest in GDG UTDallas."}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="dashboard-empty-state">
          <h2>No applications yet.</h2>
          <p>Applications will appear here after you save or submit one.</p>
          <Link className="primary-link" href="/apply">View applications <span aria-hidden="true">→</span></Link>
        </div>
      )}
    </>
  );
}
