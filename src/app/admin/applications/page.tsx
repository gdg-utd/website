import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ApplicationReviewPortal } from "./application-review-portal";
import type { StaffApplicationRow } from "./application-table";
import { requireApplicationStaff } from "@/lib/application-admin";
import {
  formatCentralDate,
  publishConfirmationPhrase,
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

function noticeText(message: string | undefined, countValue: string | undefined, emailPendingValue: string | undefined) {
  const count = Number(countValue);
  const emailPending = Number(emailPendingValue);
  if (message === "published") return "Decision published. Email delivery was requested.";
  if (message === "published-all") {
    const published = Number.isSafeInteger(count) ? count : 0;
    const pendingCopy = Number.isSafeInteger(emailPending) && emailPending > 0
      ? ` ${emailPending} email${emailPending === 1 ? " remains" : "s remain"} queued for another delivery attempt.`
      : " Decision emails were requested.";
    return `${published} staged decision${published === 1 ? " was" : "s were"} published.${pendingCopy}`;
  }
  if (message === "reopened") return "The application was reopened and returned to the applicant.";
  if (message === "no-staged") return "There are no unpublished staged decisions for this opening.";
  if (message === "admin-required") return "Reviewer access allows staging only. An administrator must publish or reopen applications.";
  if (message === "opening-required") return "Select one application opening before publishing staged decisions.";
  if (message === "confirmation-required") return "The confirmation text did not match. No decisions were published.";
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
    || message === "opening-required"
    || message === "confirmation-required"
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
  const resolvedStageApplications = new Set<number>();
  for (const event of stagedEvents ?? []) {
    if (resolvedStageApplications.has(event.application_id)) continue;
    const submittedAt = submittedAtByApplication.get(event.application_id);
    if (!submittedAt || event.created_at < submittedAt) continue;
    resolvedStageApplications.add(event.application_id);
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
  const selectedOpeningFilter = openings?.find((opening) => opening.slug === filters.position);
  const stagedCountForOpening = selectedOpeningFilter
    ? (applications ?? []).filter((application) => (
      application.opening_id === selectedOpeningFilter.id
      && application.published_decision === "undecided"
      && stagedByApplication.has(application.id)
    )).length
    : 0;

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
  const notice = noticeText(filters.message, filters.count, filters.emailPending);

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
          <ApplicationReviewPortal
            applications={rows}
            initialApplicationId={validSelectedId}
            publishOpening={role === "admin" && selectedOpeningFilter ? {
              slug: selectedOpeningFilter.slug,
              title: selectedOpeningFilter.title,
              confirmationPhrase: publishConfirmationPhrase(selectedOpeningFilter.title),
              stagedCount: stagedCountForOpening,
            } : undefined}
            returnPosition={filters.position}
            role={role}
          />
        </section>
      </div>
    </main>
  );
}
