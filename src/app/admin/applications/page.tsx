import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  publishApplicationDecision,
  publishStagedDecisions,
  reopenApplication,
  stageApplicationDecision,
} from "./actions";
import { ApplicationTable, type StaffApplicationRow } from "./application-table";
import { requireApplicationStaff } from "@/lib/application-admin";
import {
  answerLabel,
  formatCentralDate,
  parseApplicationOpening,
  type ApplicationResponses,
} from "@/lib/applications";

export const metadata: Metadata = { title: "Application portal" };
export const dynamic = "force-dynamic";

type AdminApplicationsPageProps = {
  searchParams: Promise<{
    application?: string;
    position?: string;
    decision?: string;
    q?: string;
    message?: string;
    count?: string;
    emailPending?: string;
  }>;
};

function listHref(filters: { position?: string; decision?: string; q?: string }) {
  const params = new URLSearchParams();
  if (filters.position) params.set("position", filters.position);
  if (filters.decision) params.set("decision", filters.decision);
  if (filters.q) params.set("q", filters.q);
  const query = params.toString();
  return `/admin/applications${query ? `?${query}` : ""}`;
}

function noticeText(message: string | undefined, countValue: string | undefined, emailPendingValue: string | undefined) {
  const count = Number(countValue);
  const emailPending = Number(emailPendingValue);
  if (message === "staged") return "Decision staged. It remains private until an administrator publishes staged decisions.";
  if (message === "published") return "Decision published. Email delivery was requested.";
  if (message === "published-all") {
    const published = Number.isSafeInteger(count) ? count : 0;
    const pendingCopy = Number.isSafeInteger(emailPending) && emailPending > 0
      ? ` ${emailPending} email${emailPending === 1 ? " remains" : "s remain"} queued for another delivery attempt.`
      : " Decision emails were requested.";
    return `${published} staged decision${published === 1 ? " was" : "s were"} published.${pendingCopy}`;
  }
  if (message === "reopened") return "The application was reopened and returned to the applicant.";
  if (message === "no-staged") return "There are no unpublished staged decisions.";
  if (message === "admin-required") return "Reviewer access allows staging only. An administrator must publish or reopen applications.";
  if (message === "stage-required") return "Stage a decision before publishing it.";
  if (message === "stage-failed") return "The decision could not be staged.";
  if (message === "publish-failed" || message === "publish-all-failed") return "The decision could not be published.";
  if (message === "reopen-failed") return "The application could not be reopened.";
  return null;
}

function isErrorNotice(message: string | undefined) {
  return message === "stage-failed"
    || message === "publish-failed"
    || message === "publish-all-failed"
    || message === "reopen-failed"
    || message === "admin-required";
}

export default async function AdminApplicationsPage({ searchParams }: AdminApplicationsPageProps) {
  const filters = await searchParams;
  const { supabase, role } = await requireApplicationStaff();
  const [{ data: applications }, { data: openings }, { data: stagedEvents }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, applicant_first_name, applicant_last_name, applicant_email, opening_id, submitted_at, published_decision, application_openings(slug, title, accent)")
      .eq("submission_state", "submitted")
      .order("submitted_at", { ascending: false }),
    supabase
      .from("application_openings")
      .select("id, slug, title")
      .neq("status", "draft")
      .order("id"),
    supabase
      .from("application_events")
      .select("application_id, details, created_at, id")
      .eq("event_type", "decision_staged")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
  ]);

  const submittedAtByApplication = new Map(
    (applications ?? []).map((application) => [application.id, application.submitted_at]),
  );
  const stagedByApplication = new Map<number, "accepted" | "rejected">();
  for (const event of stagedEvents ?? []) {
    if (stagedByApplication.has(event.application_id)) continue;
    const submittedAt = submittedAtByApplication.get(event.application_id);
    if (!submittedAt || event.created_at < submittedAt) continue;
    const decision = event.details && typeof event.details === "object" && !Array.isArray(event.details)
      ? event.details.decision
      : null;
    if (decision === "accepted" || decision === "rejected") {
      stagedByApplication.set(event.application_id, decision);
    }
  }

  const query = filters.q?.trim().toLowerCase() ?? "";
  const filtered = (applications ?? []).filter((application) => {
    const opening = application.application_openings;
    const searchValue = `${application.applicant_first_name} ${application.applicant_last_name} ${application.applicant_email}`.toLowerCase();
    const matchesPosition = !filters.position || opening?.slug === filters.position;
    const matchesDecision = !filters.decision
      || (filters.decision === "staged" && application.published_decision === "undecided" && stagedByApplication.has(application.id))
      || application.published_decision === filters.decision;
    return matchesPosition && matchesDecision && (!query || searchValue.includes(query));
  });

  const total = applications?.length ?? 0;
  const accepted = applications?.filter((application) => application.published_decision === "accepted").length ?? 0;
  const notSelected = applications?.filter((application) => application.published_decision === "rejected").length ?? 0;
  const awaiting = total - accepted - notSelected;
  const stagedCount = (applications ?? []).filter((application) => (
    application.published_decision === "undecided" && stagedByApplication.has(application.id)
  )).length;

  const queryString = listHref(filters).split("?")[1] ?? "";
  const rows: StaffApplicationRow[] = filtered.map((application) => {
    const staged = stagedByApplication.get(application.id);
    const decision = application.published_decision !== "undecided"
      ? application.published_decision
      : staged ? `${staged} staged` : "undecided";
    return {
      id: application.id,
      applicantName: `${application.applicant_first_name} ${application.applicant_last_name}`,
      applicantEmail: application.applicant_email,
      openingTitle: application.application_openings?.title ?? "—",
      submittedLabel: formatCentralDate(application.submitted_at),
      decisionKey: decision.split(" ")[0].toLowerCase(),
      decisionLabel: decision === "rejected"
        ? "Not selected"
        : decision === "rejected staged"
          ? "Not selected staged"
          : decision === "undecided" ? "Undecided" : decision,
    };
  });

  const selectedId = Number(filters.application);
  const validSelectedId = Number.isSafeInteger(selectedId) && selectedId > 0
    && (applications ?? []).some((application) => application.id === selectedId)
    ? selectedId
    : null;
  const [{ data: selectedApplication }, { data: selectedEvents }] = validSelectedId
    ? await Promise.all([
      supabase
        .from("applications")
        .select("*, application_openings(*)")
        .eq("id", validSelectedId)
        .eq("submission_state", "submitted")
        .maybeSingle(),
      supabase
        .from("application_events")
        .select("id, event_type, details, created_at")
        .eq("application_id", validSelectedId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }),
    ])
    : [{ data: null }, { data: null }];

  const selectedOpening = selectedApplication?.application_openings
    ? parseApplicationOpening(selectedApplication.application_openings)
    : null;
  const selectedResponses = selectedApplication?.responses as ApplicationResponses | undefined;
  const selectedStagedDecision = selectedApplication
    ? stagedByApplication.get(selectedApplication.id)
    : undefined;
  const notice = noticeText(filters.message, filters.count, filters.emailPending);
  const closeHref = listHref(filters);

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/" aria-label="GDG UTDallas home">
          <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} loading="eager" />
        </Link>
        <nav>
          <Link href="/dashboard">Member dashboard</Link>
          <Link href="/admin/applications" aria-current="page">Applications</Link>
        </nav>
      </header>

      <div className="admin-shell">
        <div className="admin-title-row">
          <div>
            <p className="section-label">Internal portal · {role === "admin" ? "Administrator" : "Reviewer"}</p>
            <h1>Applications</h1>
            <p>{role === "admin" ? "Review applications, stage decisions, and publish results." : "Review submitted applications and stage decisions for an administrator."}</p>
          </div>
          <div className="admin-title-actions">
            {role === "admin" && (
              <form action={publishStagedDecisions}>
                <button className="admin-publish-all" disabled={stagedCount === 0}>
                  Publish staged decisions <span>{stagedCount}</span>
                </button>
              </form>
            )}
            {role === "admin" && (
              <Link className="admin-export" href="/admin/applications/export" prefetch={false}>
                Export CSV <span aria-hidden="true">↓</span>
              </Link>
            )}
          </div>
        </div>

        {notice && (
          <p className={`admin-notice${isErrorNotice(filters.message) ? " admin-notice-error" : ""}`} role="status">
            {notice}
          </p>
        )}

        <section className="admin-metrics" aria-label="Application summary">
          <div><strong>{total}</strong><span>Submitted</span></div>
          <div><strong>{awaiting}</strong><span>Awaiting decision</span></div>
          <div><strong>{accepted}</strong><span>Accepted</span></div>
          <div><strong>{notSelected}</strong><span>Not selected</span></div>
        </section>

        <form className="admin-filters" method="get">
          <label>
            <span>Search</span>
            <input name="q" defaultValue={filters.q} placeholder="Name or email" />
          </label>
          <label>
            <span>Position</span>
            <select name="position" defaultValue={filters.position ?? ""}>
              <option value="">All positions</option>
              {openings?.map((opening) => <option value={opening.slug} key={opening.id}>{opening.title}</option>)}
            </select>
          </label>
          <label>
            <span>Decision</span>
            <select name="decision" defaultValue={filters.decision ?? ""}>
              <option value="">All decisions</option>
              <option value="undecided">Undecided</option>
              <option value="staged">Staged</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Not selected</option>
            </select>
          </label>
          <button type="submit">Apply filters</button>
          {(filters.q || filters.position || filters.decision) && <Link href="/admin/applications">Clear</Link>}
        </form>

        <section className="admin-table-card">
          <div className="admin-table-heading">
            <h2>Submitted applications</h2>
            <span>{filtered.length} shown</span>
          </div>
          {rows.length > 0
            ? <ApplicationTable applications={rows} queryString={queryString} />
            : <div className="admin-table-empty">No applications match these filters.</div>}
        </section>
      </div>

      {selectedApplication && selectedOpening && selectedResponses && (
        <div className="admin-drawer-layer">
          <Link className="admin-drawer-backdrop" href={closeHref} scroll={false} aria-label="Close application review" />
          <aside className="admin-drawer" role="dialog" aria-modal="true" aria-labelledby="application-review-title">
            <header className="admin-drawer-header">
              <div>
                <p className="section-label">{selectedOpening.title}</p>
                <h2 id="application-review-title">{selectedApplication.applicant_first_name} {selectedApplication.applicant_last_name}</h2>
                <a href={`mailto:${selectedApplication.applicant_email}`}>{selectedApplication.applicant_email}</a>
              </div>
              <Link href={closeHref} scroll={false} aria-label="Close application review">×</Link>
            </header>

            <dl className="admin-drawer-meta">
              <div><dt>Submitted</dt><dd>{formatCentralDate(selectedApplication.submitted_at)} CT</dd></div>
              <div><dt>Form version</dt><dd>{selectedApplication.form_version}</dd></div>
              <div><dt>Application ID</dt><dd>#{selectedApplication.id}</dd></div>
            </dl>

            <section className="admin-drawer-decision">
              <div>
                <p className="section-label">Decision</p>
                <h3>{selectedApplication.published_decision === "undecided"
                  ? "Not published"
                  : selectedApplication.published_decision === "accepted" ? "Accepted" : "Not selected"}</h3>
                {selectedApplication.published_decision === "undecided" ? (
                  <p>{selectedStagedDecision === "accepted"
                    ? "Acceptance is staged."
                    : selectedStagedDecision === "rejected"
                      ? "Not selected is staged."
                      : "No decision has been staged."}</p>
                ) : <p>Published {formatCentralDate(selectedApplication.decision_published_at)} CT.</p>}
              </div>

              {selectedApplication.published_decision === "undecided" && (
                <div className="admin-stage-actions">
                  <form action={stageApplicationDecision}>
                    <input type="hidden" name="applicationId" value={selectedApplication.id} />
                    <input type="hidden" name="decision" value="accepted" />
                    <button className={selectedStagedDecision === "accepted" ? "is-active" : ""}>Stage acceptance</button>
                  </form>
                  <form action={stageApplicationDecision}>
                    <input type="hidden" name="applicationId" value={selectedApplication.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <button className={selectedStagedDecision === "rejected" ? "is-active" : ""}>Stage not selected</button>
                  </form>
                </div>
              )}

              {role === "admin" && (
                <div className="admin-secondary-actions">
                  {selectedApplication.published_decision === "undecided" && (
                    <form action={publishApplicationDecision}>
                      <input type="hidden" name="applicationId" value={selectedApplication.id} />
                      <button disabled={!selectedStagedDecision}>Publish this decision</button>
                    </form>
                  )}
                  <details className="admin-reopen">
                    <summary>Application corrections</summary>
                    <p>Reopening returns this application to draft and clears any published decision.</p>
                    <form action={reopenApplication}>
                      <input type="hidden" name="applicationId" value={selectedApplication.id} />
                      <button>Reopen application</button>
                    </form>
                  </details>
                </div>
              )}
              {role === "reviewer" && selectedApplication.published_decision === "undecided" && (
                <p className="admin-role-note">An administrator will publish staged decisions and send applicant emails.</p>
              )}
            </section>

            <section className="admin-drawer-responses">
              <div className="admin-drawer-section-heading">
                <p className="section-label">Review</p>
                <h3>Application responses</h3>
              </div>
              {selectedOpening.form_schema.sections.map((section) => (
                <div className="admin-response-section" key={section.id}>
                  <h4>{section.title}</h4>
                  {section.fields.map((field) => {
                    const answer = answerLabel(field, selectedResponses[field.id]);
                    return (
                      <div className="admin-response" key={field.id}>
                        <h5>{field.label}</h5>
                        {field.type === "url" && answer ? (
                          <a href={answer} target="_blank" rel="noreferrer">{answer} ↗</a>
                        ) : <p>{answer || "No response"}</p>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </section>

            <section className="admin-drawer-history">
              <div className="admin-drawer-section-heading">
                <p className="section-label">Audit history</p>
                <h3>Application activity</h3>
              </div>
              <ol>
                {selectedEvents?.map((event) => {
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
          </aside>
        </div>
      )}
    </main>
  );
}
