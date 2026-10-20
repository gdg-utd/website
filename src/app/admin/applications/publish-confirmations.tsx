"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  markOfficerApplicationNotSelected,
  publishApplicationDecision,
  publishStagedDecisions,
  releaseExpiredMenteeOffers,
  reopenApplication,
} from "./actions";

function PublishSubmitButton({
  ready = true,
  idleLabel,
}: {
  ready?: boolean;
  idleLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className="confirmation-primary" disabled={!ready || pending}>
      {pending ? "Publishing…" : idleLabel}
    </button>
  );
}

function ActionSubmitButton({ idleLabel, pendingLabel }: { idleLabel: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="confirmation-primary" disabled={pending}>
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

export function ReopenApplicationButton({
  applicationId,
  applicantName,
  returnPosition,
}: {
  applicationId: number;
  applicantName: string;
  returnPosition?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        Reopen application
      </button>
      <ConfirmationDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Reopen ${applicantName}’s application?`}
        description={(
          <p>
            This will return the application to draft and clear any published decision.
            {" "}{applicantName} will be able to edit and resubmit their application.
          </p>
        )}
        actions={(
          <>
            <button type="button" className="confirmation-cancel" onClick={() => setOpen(false)} autoFocus>
              Cancel
            </button>
            <form action={reopenApplication}>
              <input type="hidden" name="applicationId" value={applicationId} />
              <input type="hidden" name="returnPosition" value={returnPosition ?? ""} />
              <ActionSubmitButton idleLabel="Reopen application" pendingLabel="Reopening…" />
            </form>
          </>
        )}
      />
    </>
  );
}

export function PublishApplicationDecisionButton({
  applicationId,
  applicantName,
  decision,
  disabled,
  returnPosition,
}: {
  applicationId: number;
  applicantName: string;
  decision: "accepted" | "rejected" | undefined;
  disabled: boolean;
  returnPosition?: string;
}) {
  const [open, setOpen] = useState(false);
  const decisionLabel = decision === "accepted" ? "acceptance" : "not selected";

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        Publish this decision
      </button>
      <ConfirmationDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Publish ${decisionLabel} decision?`}
        description={(
          <p>
            This will make the decision visible to {applicantName} and request their decision email immediately. This action cannot be undone.
          </p>
        )}
        actions={(
          <>
            <button type="button" className="confirmation-cancel" onClick={() => setOpen(false)} autoFocus>
              Cancel
            </button>
            <form action={publishApplicationDecision}>
              <input type="hidden" name="applicationId" value={applicationId} />
              <input type="hidden" name="returnPosition" value={returnPosition ?? ""} />
              <PublishSubmitButton idleLabel="Publish decision" />
            </form>
          </>
        )}
      />
    </>
  );
}

export function PublishOpeningDecisionsButton({
  openingSlug,
  openingTitle,
  confirmationPhrase,
  stagedCount,
}: {
  openingSlug: string;
  openingTitle: string;
  confirmationPhrase: string;
  stagedCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const matches = confirmation === confirmationPhrase;

  function close() {
    setOpen(false);
    setConfirmation("");
  }

  return (
    <>
      <button
        className="admin-publish-all"
        type="button"
        disabled={stagedCount === 0}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        Publish staged decisions <span>{stagedCount}</span>
      </button>
      <ConfirmationDialog
        open={open}
        onClose={close}
        title={`Publish decisions for ${openingTitle}?`}
        description={(
          <>
            <p>
              This will publish {stagedCount} staged decision{stagedCount === 1 ? "" : "s"} for this opening and request applicant emails immediately.
            </p>
            <p>Other openings will not be changed. Search and decision filters do not limit this action.</p>
          </>
        )}
        actions={(
          <>
            <button type="button" className="confirmation-cancel" onClick={close}>
              Cancel
            </button>
            <form action={publishStagedDecisions}>
              <input type="hidden" name="openingSlug" value={openingSlug} />
              <input type="hidden" name="confirmation" value={confirmation} />
              <PublishSubmitButton ready={matches} idleLabel={`Publish ${stagedCount} decision${stagedCount === 1 ? "" : "s"}`} />
            </form>
          </>
        )}
      >
        <label className="confirmation-phrase-field">
          <span>Type <strong>{confirmationPhrase}</strong> to continue</span>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
        </label>
      </ConfirmationDialog>
    </>
  );
}

export function ReleaseExpiredOffersButton({
  openingId,
  expiredCount,
}: {
  openingId: number;
  expiredCount: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="admin-release-expired"
        type="button"
        disabled={expiredCount === 0}
        onClick={() => setOpen(true)}
      >
        Release expired offers <span>{expiredCount}</span>
      </button>
      <ConfirmationDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Release ${expiredCount} expired offer${expiredCount === 1 ? "" : "s"}?`}
        description={(
          <p>
            These applicants did not respond within 72 hours. Their dashboard status will change to not selected, each will receive the RSVP-expiry email, and the same number of spots can be offered in the next round.
          </p>
        )}
        actions={(
          <>
            <button type="button" className="confirmation-cancel" onClick={() => setOpen(false)}>Cancel</button>
            <form action={releaseExpiredMenteeOffers}>
              <input type="hidden" name="openingId" value={openingId} />
              <input type="hidden" name="openingSlug" value="sprint-mentee" />
              <ActionSubmitButton idleLabel="Release expired offers" pendingLabel="Releasing…" />
            </form>
          </>
        )}
      />
    </>
  );
}

export function MarkOfficerNotSelectedButton({
  applicationId,
  applicantName,
  returnPosition,
}: {
  applicationId: number;
  applicantName: string;
  returnPosition?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="admin-interview-outcome" onClick={() => setOpen(true)}>
        Mark not selected after interview
      </button>
      <ConfirmationDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Mark ${applicantName} as not selected?`}
        description={(
          <>
            <p>This updates the applicant’s dashboard from selected to not selected.</p>
            <p><strong>No email will be sent.</strong> Send the personal interview follow-up before changing the status here.</p>
          </>
        )}
        actions={(
          <>
            <button type="button" className="confirmation-cancel" onClick={() => setOpen(false)}>Cancel</button>
            <form action={markOfficerApplicationNotSelected}>
              <input type="hidden" name="applicationId" value={applicationId} />
              <input type="hidden" name="returnPosition" value={returnPosition ?? ""} />
              <ActionSubmitButton idleLabel="Mark not selected" pendingLabel="Updating…" />
            </form>
          </>
        )}
      />
    </>
  );
}
