import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApplicationAdmin } from "@/lib/application-admin";
import {
  answerLabel,
  formatCentralDate,
  parseApplicationOpening,
  type ApplicationResponses,
} from "@/lib/applications";
import {
  publishApplicationDecision,
  reopenApplication,
  stageApplicationDecision,
} from "../actions";

export const metadata: Metadata = { title: "Review application" };
export const dynamic = "force-dynamic";

type ApplicationDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
};

const messages: Record<string, string> = {
  staged: "Decision staged. It is still private.",
  published: "Decision published. Email delivery was requested.",
  "stage-required": "Stage a decision before publishing.",
  "stage-failed": "The decision could not be staged.",
  "publish-failed": "The decision could not be published.",
  "reopen-failed": "The application could not be reopened.",
};

export default async function ApplicationDetailPage({ params, searchParams }: ApplicationDetailPageProps) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const { supabase } = await requireApplicationAdmin(`/admin/applications/${id}`);
  const [{ data: application }, { data: events }] = await Promise.all([
    supabase
      .from("applications")
      .select("*, application_openings(*)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("application_events")
      .select("id, event_type, details, created_at")
      .eq("application_id", id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
  ]);

  if (!application || !application.application_openings) notFound();
  const opening = parseApplicationOpening(application.application_openings);
  const responses = application.responses as ApplicationResponses;
  const stagedEvent = events?.find((event) => event.event_type === "decision_staged");
  const stagedDecision = stagedEvent?.details && typeof stagedEvent.details === "object" && !Array.isArray(stagedEvent.details)
    ? stagedEvent.details.decision
    : null;
  const notice = query.message ? messages[query.message] : undefined;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/" aria-label="GDG UTDallas home">
          <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} loading="eager" />
        </Link>
        <nav><Link href="/dashboard">Member dashboard</Link><Link href="/admin/applications">Applications</Link></nav>
      </header>

      <div className="admin-shell admin-detail-shell">
        <Link className="admin-back" href="/admin/applications">← All applications</Link>
        {notice && <p className="admin-notice" role="status">{notice}</p>}

        <div className="admin-detail-heading">
          <div>
            <p className="section-label">{opening.title}</p>
            <h1>{application.applicant_first_name} {application.applicant_last_name}</h1>
            <a href={`mailto:${application.applicant_email}`}>{application.applicant_email}</a>
          </div>
          <dl>
            <div><dt>Submitted</dt><dd>{formatCentralDate(application.submitted_at)} CT</dd></div>
            <div><dt>Form version</dt><dd>{application.form_version}</dd></div>
            <div><dt>Application ID</dt><dd>#{application.id}</dd></div>
          </dl>
        </div>

        <div className="admin-detail-layout">
          <section className="admin-responses">
            <div className="admin-section-title"><p className="section-label">Review</p><h2>Application responses</h2></div>
            {opening.form_schema.sections.map((section) => (
              <div className="admin-response-section" key={section.id}>
                <h3>{section.title}</h3>
                {section.fields.map((field) => {
                  const answer = answerLabel(field, responses[field.id]);
                  return (
                    <div className="admin-response" key={field.id}>
                      <h4>{field.label}</h4>
                      {field.type === "url" && answer ? (
                        <a href={answer} target="_blank" rel="noreferrer">{answer} ↗</a>
                      ) : <p>{answer || "No response"}</p>}
                    </div>
                  );
                })}
              </div>
            ))}
          </section>

          <aside className="admin-review-panel">
            <div>
              <p className="section-label">Decision</p>
              <h2>{application.published_decision === "undecided" ? "Not published" : application.published_decision === "accepted" ? "Accepted" : "Not selected"}</h2>
              {application.published_decision === "undecided" ? (
                <p>{stagedDecision === "accepted" ? "Acceptance is staged." : stagedDecision === "rejected" ? "Not selected is staged." : "Stage a decision before publishing it."}</p>
              ) : (
                <p>Published {formatCentralDate(application.decision_published_at)} CT.</p>
              )}
            </div>

            {application.published_decision === "undecided" && (
              <>
                <div className="admin-stage-actions">
                  <form action={stageApplicationDecision}>
                    <input type="hidden" name="applicationId" value={application.id} />
                    <input type="hidden" name="decision" value="accepted" />
                    <button className={stagedDecision === "accepted" ? "is-active" : ""}>Stage acceptance</button>
                  </form>
                  <form action={stageApplicationDecision}>
                    <input type="hidden" name="applicationId" value={application.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <button className={stagedDecision === "rejected" ? "is-active" : ""}>Stage not selected</button>
                  </form>
                </div>
                <form action={publishApplicationDecision}>
                  <input type="hidden" name="applicationId" value={application.id} />
                  <button className="admin-publish" disabled={!stagedDecision}>Publish decision <span aria-hidden="true">→</span></button>
                </form>
                <p className="admin-email-note">Publishing updates the applicant dashboard and sends the matching decision email.</p>
              </>
            )}

            <div className="admin-review-divider" />
            <details className="admin-reopen">
              <summary>Application corrections</summary>
              <p>Reopening returns this application to draft and clears any published decision.</p>
              <form action={reopenApplication}>
                <input type="hidden" name="applicationId" value={application.id} />
                <button>Reopen application</button>
              </form>
            </details>
          </aside>
        </div>

        <section className="admin-history">
          <div className="admin-section-title"><p className="section-label">Audit history</p><h2>Application activity</h2></div>
          <ol>
            {events?.map((event) => {
              const eventDecision = event.details && typeof event.details === "object" && !Array.isArray(event.details)
                ? event.details.decision
                : null;
              const label = event.event_type === "submitted" ? "Application submitted"
                : event.event_type === "reopened" ? "Application reopened"
                  : event.event_type === "decision_staged" ? `${eventDecision === "accepted" ? "Acceptance" : "Not selected"} staged`
                    : `${eventDecision === "accepted" ? "Acceptance" : "Not selected"} published`;
              return <li key={event.id}><span>{label}</span><time>{formatCentralDate(event.created_at)} CT</time></li>;
            })}
          </ol>
        </section>
      </div>
    </main>
  );
}
