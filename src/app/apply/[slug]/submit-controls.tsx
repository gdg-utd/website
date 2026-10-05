"use client";

import { useFormStatus } from "react-dom";

export function ApplicationSubmitControls() {
  const { pending } = useFormStatus();

  return (
    <div className="application-form-actions">
      <button className="application-save" name="intent" value="save" disabled={pending} formNoValidate>
        {pending ? "Saving…" : "Save draft"}
      </button>
      <button
        className="application-submit"
        name="intent"
        value="submit"
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm("Submit this application? You will not be able to edit it afterward.")) {
            event.preventDefault();
          }
        }}
      >
        {pending ? "Submitting…" : "Submit application"}
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
