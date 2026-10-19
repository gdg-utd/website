"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { reopenApplication, stageApplicationDecision } from "./actions";
import { ApplicationTable, type StaffApplicationRow } from "./application-table";
import {
  MarkOfficerNotSelectedButton,
  PublishApplicationDecisionButton,
  PublishOpeningDecisionsButton,
} from "./publish-confirmations";
import type {
  ApplicationReview,
  ApplicationStageDecision,
  ApplicationStageResult,
} from "./application-review-types";

type ApplicationReviewPortalProps = {
  applications: StaffApplicationRow[];
  initialApplicationId: number | null;
  publishOpening?: {
    slug: string;
    title: string;
    confirmationPhrase: string;
    stagedCount: number;
  };
  returnPosition?: string;
  role: "admin" | "reviewer";
};

export function ApplicationReviewPortal({
  applications,
  initialApplicationId,
  publishOpening,
  returnPosition,
  role,
}: ApplicationReviewPortalProps) {
  const [selectedId, setSelectedId] = useState(initialApplicationId);
  const [loadState, setLoadState] = useState<{
    id: number;
    review?: ApplicationReview;
    error?: string;
  } | null>(null);
  const [stageOverrides, setStageOverrides] = useState<Map<number, ApplicationStageDecision>>(() => new Map());
  const [stagedCount, setStagedCount] = useState(publishOpening?.stagedCount ?? 0);

  const selectApplication = useCallback((id: number | null) => {
    setLoadState(null);
    setSelectedId(id);
  }, []);

  const selectFromUrl = useCallback(() => {
    const value = Number(new URLSearchParams(window.location.search).get("application"));
    const nextId = Number.isSafeInteger(value) && value > 0 ? value : null;
    selectApplication(nextId);
  }, [selectApplication]);

  useEffect(() => {
    window.addEventListener("popstate", selectFromUrl);
    return () => window.removeEventListener("popstate", selectFromUrl);
  }, [selectFromUrl]);

  useEffect(() => {
    if (!selectedId) return;

    const controller = new AbortController();

    fetch(`/api/admin/applications/${selectedId}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("We could not load this application.");
        return response.json() as Promise<ApplicationReview>;
      })
      .then((nextReview) => {
        setLoadState({ id: selectedId, review: nextReview });
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setLoadState({
          id: selectedId,
          error: fetchError instanceof Error ? fetchError.message : "We could not load this application.",
        });
      });

    return () => controller.abort();
  }, [selectedId]);

  function updateUrl(applicationId: number | null) {
    const url = new URL(window.location.href);
    if (applicationId) url.searchParams.set("application", String(applicationId));
    else url.searchParams.delete("application");
    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function openApplication(id: number) {
    selectApplication(id);
    updateUrl(id);
  }

  function closeApplication() {
    selectApplication(null);
    updateUrl(null);
  }

  const review = loadState?.id === selectedId ? loadState.review : undefined;
  const error = loadState?.id === selectedId ? loadState.error : undefined;
  const loading = Boolean(selectedId && !review && !error);
  const displayedApplications = applications.map((application) => {
    if (!stageOverrides.has(application.id)) return application;
    const stagedDecision = stageOverrides.get(application.id);
    if (!stagedDecision) {
      return { ...application, decisionKey: "undecided", decisionLabel: "Undecided" };
    }
    return {
      ...application,
      decisionKey: stagedDecision,
      decisionLabel: stagedDecision === "accepted" ? "accepted staged" : "Not selected staged",
    };
  });

  function handleStageChanged(
    applicationId: number,
    previousDecision: ApplicationStageDecision,
    result: Extract<ApplicationStageResult, { status: "updated" }>,
  ) {
    setLoadState((current) => {
      if (current?.id !== applicationId || !current.review) return current;
      return {
        id: applicationId,
        review: {
          ...current.review,
          stagedDecision: result.stagedDecision ?? undefined,
          events: result.event ? [result.event, ...current.review.events] : current.review.events,
        },
      };
    });
    setStageOverrides((current) => {
      const next = new Map(current);
      next.set(applicationId, result.stagedDecision);
      return next;
    });
    if (!previousDecision && result.stagedDecision) setStagedCount((count) => count + 1);
    if (previousDecision && !result.stagedDecision) setStagedCount((count) => Math.max(0, count - 1));
  }

  return (
    <>
      <div className="admin-table-heading">
        <h2>Submitted applications</h2>
        <div className="admin-table-heading-actions">
          <span>{applications.length} shown</span>
          {publishOpening && (
            <PublishOpeningDecisionsButton
              openingSlug={publishOpening.slug}
              openingTitle={publishOpening.title}
              confirmationPhrase={publishOpening.confirmationPhrase}
              stagedCount={stagedCount}
            />
          )}
        </div>
      </div>
      {displayedApplications.length > 0
        ? <ApplicationTable applications={displayedApplications} onOpenApplication={openApplication} />
        : <div className="admin-table-empty">No applications match these filters.</div>}
      {selectedId && (
        <div className="admin-drawer-layer">
          <button
            type="button"
            className="admin-drawer-backdrop"
            onClick={closeApplication}
            aria-label="Close application review"
          />
          <aside className="admin-drawer" role="dialog" aria-modal="true" aria-labelledby="application-review-title">
            {loading && <ApplicationReviewLoading onClose={closeApplication} />}
            {error && <ApplicationReviewError message={error} onClose={closeApplication} />}
            {review && (
              <ApplicationReviewContent
                review={review}
                returnPosition={returnPosition}
                role={role}
                onClose={closeApplication}
                onStageChanged={(previousDecision, result) => handleStageChanged(review.id, previousDecision, result)}
              />
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function DrawerCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" className="admin-drawer-close" onClick={onClose} aria-label="Close application review">
      ×
    </button>
  );
}

function ApplicationReviewLoading({ onClose }: { onClose: () => void }) {
  return (
    <div className="admin-drawer-loading" aria-live="polite" aria-busy="true">
      <DrawerCloseButton onClose={onClose} />
      <div className="admin-drawer-loading-heading">
        <span />
        <strong>Loading application…</strong>
        <span />
      </div>
      <div className="admin-drawer-loading-card" />
      <div className="admin-drawer-loading-card admin-drawer-loading-card-tall" />
    </div>
  );
}

function ApplicationReviewError({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="admin-drawer-error" role="alert">
      <DrawerCloseButton onClose={onClose} />
      <p className="section-label">Unable to open review</p>
      <h2 id="application-review-title">Application unavailable</h2>
      <p>{message} Close the review and try again.</p>
    </div>
  );
}

function ApplicationReviewContent({
  review,
  returnPosition,
  role,
  onClose,
  onStageChanged,
}: {
  review: ApplicationReview;
  returnPosition?: string;
  role: "admin" | "reviewer";
  onClose: () => void;
  onStageChanged: (
    previousDecision: ApplicationStageDecision,
    result: Extract<ApplicationStageResult, { status: "updated" }>,
  ) => void;
}) {
  return (
    <>
      <header className="admin-drawer-header">
        <div>
          <p className="section-label">{review.openingTitle}</p>
          <h2 id="application-review-title">{review.applicantName}</h2>
          <a href={`mailto:${review.applicantEmail}`}>{review.applicantEmail}</a>
        </div>
        <DrawerCloseButton onClose={onClose} />
      </header>

      <dl className="admin-drawer-meta">
        <div><dt>Submitted</dt><dd>{review.submittedLabel} CT</dd></div>
        <div><dt>Form version</dt><dd>{review.formVersion}</dd></div>
        <div><dt>Application ID</dt><dd>#{review.id}</dd></div>
      </dl>

      <section className="admin-drawer-decision">
        <div>
          <p className="section-label">Decision</p>
          <h3>{review.publishedDecision === "undecided"
            ? "Not published"
            : review.publishedDecision === "accepted" && review.openingSlug !== "sprint-mentee"
              ? "Selected"
              : review.publishedDecision === "accepted" ? "Accepted" : "Not selected"}</h3>
          {review.publishedDecision === "undecided" ? (
            <p>{review.stagedDecision === "accepted"
              ? "Acceptance is staged."
              : review.stagedDecision === "rejected"
                ? "Not selected is staged."
                : "No decision has been staged."}</p>
          ) : <p>Published {review.publishedLabel} CT.</p>}
        </div>

        {review.publishedDecision === "undecided" && (
          <ApplicationStageControls review={review} onStageChanged={onStageChanged} />
        )}

        {review.rsvp && (
          <dl className="admin-rsvp-details">
            <div>
              <dt>RSVP status</dt>
              <dd>{review.rsvp.status === "awaiting_response" ? "Awaiting response" : review.rsvp.status === "confirmed" ? "Spot confirmed" : review.rsvp.status === "released" ? "Spot released" : "Expired"}</dd>
            </div>
            <div>
              <dt>72-hour deadline</dt>
              <dd>{review.rsvp.deadlineLabel} CT</dd>
            </div>
            {review.rsvp.respondedLabel && (
              <div><dt>Responded</dt><dd>{review.rsvp.respondedLabel} CT</dd></div>
            )}
          </dl>
        )}

        {role === "admin" && (
          <div className="admin-secondary-actions">
            {review.publishedDecision === "undecided" && (
              <PublishApplicationDecisionButton
                applicationId={review.id}
                applicantName={review.applicantName}
                decision={review.stagedDecision}
                disabled={!review.stagedDecision}
                returnPosition={returnPosition}
              />
            )}
            {review.publishedDecision === "accepted" && review.openingSlug !== "sprint-mentee" && (
              <MarkOfficerNotSelectedButton
                applicationId={review.id}
                applicantName={review.applicantName}
                returnPosition={returnPosition}
              />
            )}
            <details className="admin-reopen">
              <summary>Application corrections</summary>
              <p>Reopening returns this application to draft and clears any published decision.</p>
              <form action={reopenApplication}>
                <input type="hidden" name="applicationId" value={review.id} />
                <input type="hidden" name="returnPosition" value={returnPosition ?? ""} />
                <button>Reopen application</button>
              </form>
            </details>
          </div>
        )}
        {role === "reviewer" && review.publishedDecision === "undecided" && (
          <p className="admin-role-note">An administrator will publish staged decisions and send applicant emails.</p>
        )}
      </section>

      <section className="admin-drawer-responses">
        <div className="admin-drawer-section-heading">
          <p className="section-label">Review</p>
          <h3>Application responses</h3>
        </div>
        {review.sections.map((section) => (
          <div className="admin-response-section" key={section.id}>
            <h4>{section.title}</h4>
            {section.fields.map((field) => (
              <div className="admin-response" key={field.id}>
                <h5>{field.label}</h5>
                {field.type === "url" && field.answer ? (
                  <a href={field.answer} target="_blank" rel="noreferrer">{field.answer} ↗</a>
                ) : <p>{field.answer || "No response"}</p>}
              </div>
            ))}
          </div>
        ))}
      </section>

      <section className="admin-drawer-history">
        <div className="admin-drawer-section-heading">
          <p className="section-label">Audit history</p>
          <h3>Application activity</h3>
        </div>
        <ol>
          {review.events.map((event) => (
            <li key={event.id}><span>{event.label}</span><time>{event.createdLabel} CT</time></li>
          ))}
        </ol>
      </section>
    </>
  );
}

function ApplicationStageControls({
  review,
  onStageChanged,
}: {
  review: ApplicationReview;
  onStageChanged: (
    previousDecision: ApplicationStageDecision,
    result: Extract<ApplicationStageResult, { status: "updated" }>,
  ) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function selectStage(decision: ApplicationStageDecision) {
    const previousDecision = review.stagedDecision ?? null;
    if (pending || previousDecision === decision) return;

    setError(null);
    startTransition(async () => {
      const result = await stageApplicationDecision(review.id, decision);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      if (result.status === "updated") onStageChanged(previousDecision, result);
    });
  }

  return (
    <div className="admin-stage-actions">
      <button
        type="button"
        className={review.stagedDecision === "accepted" ? "is-active" : ""}
        aria-pressed={review.stagedDecision === "accepted"}
        disabled={pending || review.stagedDecision === "accepted"}
        onClick={() => selectStage("accepted")}
      >
        {pending ? "Saving…" : "Stage acceptance"}
      </button>
      <button
        type="button"
        className={review.stagedDecision === "rejected" ? "is-active" : ""}
        aria-pressed={review.stagedDecision === "rejected"}
        disabled={pending || review.stagedDecision === "rejected"}
        onClick={() => selectStage("rejected")}
      >
        {pending ? "Saving…" : "Stage not selected"}
      </button>
      {review.stagedDecision && (
        <button
          type="button"
          className="admin-stage-clear"
          disabled={pending}
          onClick={() => selectStage(null)}
        >
          Clear staged selection
        </button>
      )}
      {error && <p className="admin-stage-error" role="alert">{error}</p>}
    </div>
  );
}
