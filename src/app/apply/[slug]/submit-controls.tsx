"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

export function ApplicationSubmitControls() {
  const { pending } = useFormStatus();
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  return (
    <>
      <div className="application-form-actions">
        <button className="application-save" name="intent" value="save" disabled={pending} formNoValidate>
          {pending ? "Saving…" : "Save draft"}
        </button>
        <button
          className="application-submit"
          type="button"
          disabled={pending}
          aria-haspopup="dialog"
          onClick={(event) => {
            if (event.currentTarget.form?.reportValidity()) setConfirmationOpen(true);
          }}
        >
          Submit application
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <ConfirmationDialog
        open={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        title="Submit your application?"
        description={(
          <p>After you submit, you won&apos;t be able to edit your responses.</p>
        )}
        actions={(
          <>
            <button type="button" className="confirmation-cancel" onClick={() => setConfirmationOpen(false)} autoFocus>
              Keep editing
            </button>
            <button className="confirmation-primary" name="intent" value="submit" disabled={pending}>
              {pending ? "Submitting…" : "Yes, submit application"}
            </button>
          </>
        )}
      />
    </>
  );
}
