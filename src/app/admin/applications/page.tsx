import { DataUnavailable } from "@/components/data-unavailable";
import { normalizeQuery } from "@/lib/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ApplicationReviewPortal } from "./application-review-portal";
import type { StaffApplicationRow } from "./application-table";
import { ReleaseExpiredOffersButton } from "./publish-confirmations";
import { requireApplicationStaff } from "@/lib/application-admin";
import {
  formatCentralDate,
  publishConfirmationPhrase,
} from "@/lib/applications";
import { redirect } from "next/navigation";
import {
  applicationPageNumber,
  type StaffApplicationPage,
} from "@/lib/staff-application-page";

export const metadata: Metadata = { title: "Application portal" };
export const dynamic = "force-dynamic";

type AdminApplicationsPageProps = {
  searchParams: Promise<{
    page?: string;
    application?: string;
    position?: string;
    decision?: string;
    q?: string;
    message?: string;
    count?: string;
    emailPending?: string;
  }>;
};

function noticeText(
  message: string | undefined,
  countValue: string | undefined,
  emailPendingValue: string | undefined,
) {
  const count = Number(countValue);
  const emailPending = Number(emailPendingValue);
  if (message === "published")
    return "Decision published. Email delivery was requested.";
  if (message === "published-all") {
    const published = Number.isSafeInteger(count) ? count : 0;
    const pendingCopy =
      Number.isSafeInteger(emailPending) && emailPending > 0
        ? ` ${emailPending} notification${emailPending === 1 ? " is" : "s are"} awaiting delivery confirmation. Check delivery status in each application review.`
        : " Decision emails were requested.";
    return `${published} staged decision${published === 1 ? " was" : "s were"} published.${pendingCopy}`;
  }
  if (message === "reopened")
    return "The application was reopened and returned to the applicant.";
  if (message === "expired-released") {
    const released = Number.isSafeInteger(count) ? count : 0;
    const pendingCopy =
      Number.isSafeInteger(emailPending) && emailPending > 0
        ? ` ${emailPending} expiry notification${emailPending === 1 ? " is" : "s are"} awaiting delivery confirmation. Check delivery status in each application review.`
        : " RSVP-expiry emails were requested.";
    return `${released} expired offer${released === 1 ? " was" : "s were"} released.${pendingCopy}`;
  }
  if (message === "no-expired")
    return "There are no expired offers ready to release.";
  if (message === "interview-not-selected")
    return "The officer applicant is now marked as not selected. No automated email was sent.";
  if (message === "no-staged")
    return "There are no unpublished staged decisions for this opening.";
  if (message === "admin-required")
    return "Reviewer access allows staging only. An administrator must publish or reopen applications.";
  if (message === "opening-required")
    return "Select one application opening before publishing staged decisions.";
  if (message === "confirmation-required")
    return "The confirmation text did not match. No decisions were published.";
  if (message === "stage-required")
    return "Stage a decision before publishing it.";
  if (message === "stage-failed") return "The decision could not be staged.";
  if (message === "publish-failed" || message === "publish-all-failed")
    return "The decision could not be published.";
  if (message === "reopen-failed")
    return "The application could not be reopened.";
  if (message === "expire-failed")
    return "The expired offers could not be released.";
  if (message === "interview-outcome-failed")
    return "The officer interview outcome could not be updated.";
  return null;
}

function isErrorNotice(message: string | undefined) {
  return (
    message === "stage-failed" ||
    message === "publish-failed" ||
    message === "publish-all-failed" ||
    message === "reopen-failed" ||
    message === "expire-failed" ||
    message === "interview-outcome-failed" ||
    message === "opening-required" ||
    message === "confirmation-required" ||
    message === "admin-required"
  );
}

export default async function AdminApplicationsPage({
  searchParams,
}: AdminApplicationsPageProps) {
  const filters = normalizeQuery(await searchParams);
  const { supabase, role } = await requireApplicationStaff();
  const page = applicationPageNumber(filters.page);
  function pageHref(number: number) {
    const query = new URLSearchParams();
    for (const key of ["q", "position", "decision"] as const)
      if (filters[key]) query.set(key, filters[key]);
    if (number > 1) query.set("page", String(number));
    return `/admin/applications${query.size ? `?${query}` : ""}`;
  }
  const [
    { data: pageData, error: pageError },
    { data: openings, error: openingsError },
  ] = await Promise.all([
    supabase.rpc("get_staff_application_page", {
      p_q: filters.q?.trim().slice(0, 200) ?? "",
      p_position: filters.position ?? "",
      p_decision: filters.decision ?? "",
      p_page: page,
      p_page_size: 25,
    }),
    supabase
      .from("application_openings")
      .select("id,slug,title")
      .neq("status", "draft")
      .order("id"),
  ]);
  if (pageError || openingsError || !pageData) {
    console.error(
      "Unable to load staff application portal",
      pageError?.code ?? openingsError?.code,
    );
    return (
      <main id="main-content" tabIndex={-1} className="admin-page">
        <DataUnavailable
          href="/admin/applications"
          label="the application portal"
        />
      </main>
    );
  }
  const result = pageData as unknown as StaffApplicationPage;
  const applications = result.applications;
  const pages = Math.max(1, Math.ceil(result.matched / result.pageSize));
  if (page > pages) redirect(pageHref(pages));
  const { total, accepted, notSelected, awaiting } = result.metrics;
  const selectedOpeningFilter = openings?.find(
    (opening) => opening.slug === filters.position,
  );
  const stagedCountForOpening = result.stagedCount;
  const rsvpSummary = result.rsvpSummary;
  const stagedByApplication = new Map(
    applications.map((application) => [
      application.id,
      application.staged_decision,
    ]),
  );
  const rows: StaffApplicationRow[] = applications.map((application) => {
    const staged = stagedByApplication.get(application.id);
    const openingSlug = application.application_openings?.slug;
    const rsvp = application.application_rsvps;
    const decision =
      application.published_decision !== "undecided"
        ? application.published_decision
        : staged
          ? `${staged} staged`
          : "undecided";
    return {
      id: application.id,
      applicantName: `${application.applicant_first_name} ${application.applicant_last_name}`,
      applicantEmail: application.applicant_email,
      openingTitle: application.application_openings?.title ?? "—",
      submittedLabel: formatCentralDate(application.submitted_at),
      decisionKey:
        rsvp?.status === "confirmed"
          ? "confirmed"
          : rsvp?.status === "released"
            ? "released"
            : rsvp?.status === "expired"
              ? "expired"
              : rsvp?.status === "awaiting_response"
                ? "awaiting-rsvp"
                : decision === "accepted" && openingSlug !== "sprint-mentee"
                  ? "selected"
                  : decision.split(" ")[0].toLowerCase(),
      decisionLabel:
        rsvp?.status === "confirmed"
          ? "Spot confirmed"
          : rsvp?.status === "released"
            ? "Spot released"
            : rsvp?.status === "expired"
              ? "RSVP expired"
              : rsvp?.status === "awaiting_response"
                ? "Awaiting RSVP"
                : decision === "accepted" && openingSlug !== "sprint-mentee"
                  ? "Selected"
                  : decision === "rejected"
                    ? "Not selected"
                    : decision === "rejected staged"
                      ? "Not selected staged"
                      : decision === "undecided"
                        ? "Undecided"
                        : decision,
    };
  });

  const selectedId = Number(filters.application);
  const validSelectedId =
    Number.isSafeInteger(selectedId) && selectedId > 0 ? selectedId : null;
  const notice = noticeText(
    filters.message,
    filters.count,
    filters.emailPending,
  );

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/" aria-label="GDG UTDallas home">
          <Image
            src="/brand/gdg-lockup.svg"
            alt="Google Developer Groups"
            width={188}
            height={38}
            loading="eager"
          />
        </Link>
        <nav>
          <Link href="/dashboard">Member dashboard</Link>
          <Link href="/admin/applications" aria-current="page">
            Applications
          </Link>
        </nav>
      </header>

      <div id="main-content" tabIndex={-1} className="admin-shell">
        <div className="admin-title-row">
          <div>
            <p className="section-label">
              Internal portal ·{" "}
              {role === "admin" ? "Administrator" : "Reviewer"}
            </p>
            <h1>Applications</h1>
            <p>
              {role === "admin"
                ? "Review applications, stage decisions, and publish results."
                : "Review submitted applications and stage decisions for an administrator."}
            </p>
          </div>
          <div className="admin-title-actions">
            {role === "admin" && (
              <Link
                className="admin-export"
                href="/admin/applications/export"
                prefetch={false}
              >
                Export CSV <span aria-hidden="true">↓</span>
              </Link>
            )}
          </div>
        </div>

        {notice && (
          <p
            className={`admin-notice${isErrorNotice(filters.message) ? " admin-notice-error" : ""}`}
            role="status"
          >
            {notice}
          </p>
        )}

        <section className="admin-metrics" aria-label="Application summary">
          <div>
            <strong>{total}</strong>
            <span>Submitted</span>
          </div>
          <div>
            <strong>{awaiting}</strong>
            <span>Awaiting decision</span>
          </div>
          <div>
            <strong>{accepted}</strong>
            <span>Accepted</span>
          </div>
          <div>
            <strong>{notSelected}</strong>
            <span>Not selected</span>
          </div>
        </section>

        {selectedOpeningFilter?.slug === "sprint-mentee" && (
          <section
            className="admin-rsvp-summary"
            aria-label="Mentee RSVP summary"
          >
            <div className="admin-rsvp-summary-heading">
              <div>
                <p className="section-label">Mentee offers</p>
                <h2>RSVP status</h2>
                <p>
                  {rsvpSummary.released + rsvpSummary.expired} spot
                  {rsvpSummary.released + rsvpSummary.expired === 1 ? "" : "s"}{" "}
                  can be offered in the next round.
                </p>
              </div>
              {role === "admin" && (
                <ReleaseExpiredOffersButton
                  openingId={selectedOpeningFilter.id}
                  expiredCount={rsvpSummary.readyToRelease}
                />
              )}
            </div>
            <div className="admin-rsvp-metrics">
              <div>
                <strong>{rsvpSummary.confirmed}</strong>
                <span>Confirmed</span>
              </div>
              <div>
                <strong>{rsvpSummary.awaiting}</strong>
                <span>Awaiting response</span>
              </div>
              <div>
                <strong>{rsvpSummary.readyToRelease}</strong>
                <span>Ready to release</span>
              </div>
              <div>
                <strong>{rsvpSummary.released + rsvpSummary.expired}</strong>
                <span>Spots to refill</span>
              </div>
            </div>
          </section>
        )}

        <form className="admin-filters" method="get">
          <label>
            <span>Search</span>
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Name or email"
            />
          </label>
          <label>
            <span>Position</span>
            <select name="position" defaultValue={filters.position ?? ""}>
              <option value="">All positions</option>
              {openings?.map((opening) => (
                <option value={opening.slug} key={opening.id}>
                  {opening.title}
                </option>
              ))}
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
          {(filters.q || filters.position || filters.decision) && (
            <Link href="/admin/applications">Clear</Link>
          )}
        </form>

        <section className="admin-table-card">
          <ApplicationReviewPortal
            applications={rows}
            initialApplicationId={validSelectedId}
            publishOpening={
              role === "admin" && selectedOpeningFilter
                ? {
                    slug: selectedOpeningFilter.slug,
                    title: selectedOpeningFilter.title,
                    confirmationPhrase: publishConfirmationPhrase(
                      selectedOpeningFilter.title,
                    ),
                    stagedCount: stagedCountForOpening,
                  }
                : undefined
            }
            returnPosition={filters.position}
            role={role}
          />
        </section>
        <nav className="admin-pagination" aria-label="Application pages">
          <p>
            {result.matched
              ? `${(page - 1) * result.pageSize + 1}–${Math.min(page * result.pageSize, result.matched)} of ${result.matched}`
              : "0 applications"}
          </p>
          <div>
            {page > 1 ? (
              <Link href={pageHref(page - 1)}>← Previous</Link>
            ) : (
              <span aria-disabled="true">← Previous</span>
            )}
            <span>
              Page {page} of {pages}
            </span>
            {page < pages ? (
              <Link href={pageHref(page + 1)}>Next →</Link>
            ) : (
              <span aria-disabled="true">Next →</span>
            )}
          </div>
        </nav>
      </div>
    </main>
  );
}
