"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  publishApplicationDecision,
  publishStagedDecisions,
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
