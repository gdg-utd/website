"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { respondToMenteeOffer } from "./actions";

type RsvpStatus = "awaiting_response" | "confirmed" | "released" | "expired";

type Agreement = {
  id: string;
  label: string;
};

type RsvpResponseState = {
  status: "idle" | "success" | "error";
  rsvpStatus?: "confirmed" | "released";
  message?: string;
};

const initialRsvpResponseState: RsvpResponseState = { status: "idle" };

export function RsvpOffer({
  applicationId,
  initialStatus,
  deadlineAt,
  deadlinePassed,
  agreements,
}: {
  applicationId: number;
  initialStatus: RsvpStatus;
  deadlineAt: string;
  deadlinePassed: boolean;
  agreements: Agreement[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState(initialRsvpResponseState);
  const [status, setStatus] = useState<RsvpStatus>(initialStatus);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"choose" | "confirm" | "release">("choose");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const allChecked = agreements.length > 0 && agreements.every((agreement) => checked.has(agreement.id));

  const deadlineLabel = useMemo(() => new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago",
  }).format(new Date(deadlineAt)), [deadlineAt]);

  function submitResponse(formData: FormData) {
    setState(initialRsvpResponseState);
    startTransition(async () => {
      const result = await respondToMenteeOffer(formData);
      setState(result);
      if (result.status !== "success" || !result.rsvpStatus) return;
      setStatus(result.rsvpStatus);
      setOpen(false);
      setStep("choose");
      setChecked(new Set());
      router.refresh();
    });
  }

  function closeDialog() {
    if (pending) return;
    setOpen(false);
    setStep("choose");
    setChecked(new Set());
  }

  if (status === "confirmed") {
    return <div className="rsvp-response rsvp-response-confirmed"><strong>Spot confirmed</strong><span>Your response has been recorded.</span></div>;
  }
  if (status === "released") {
    return <div className="rsvp-response rsvp-response-released"><strong>Spot released</strong><span>Thank you for letting us know.</span></div>;
  }
  if (status === "expired" || deadlinePassed) {
    return <div className="rsvp-response rsvp-response-expired"><strong>Response window closed</strong><span>The deadline was {deadlineLabel} CT.</span></div>;
  }

  return (
    <>
      <div className="rsvp-response rsvp-response-awaiting">
        <span>Respond by {deadlineLabel} CT</span>
        <button type="button" onClick={() => setOpen(true)}>Respond to offer</button>
      </div>
      <ConfirmationDialog
        open={open}
        title={step === "confirm" ? "Confirm your SPRINT spot" : step === "release" ? "Release your spot?" : "Respond to your offer"}
        description={step === "confirm"
          ? <p>Review the program agreements again before confirming your place.</p>
          : step === "release"
            ? <p>Your place will be offered to another applicant. This response cannot be changed later.</p>
            : <p>Let us know whether you plan to join SPRINT. Your response is final.</p>}
        onClose={closeDialog}
        actions={step === "choose" ? (
          <>
            <button className="confirmation-danger" type="button" onClick={() => setStep("release")}>No, release my spot</button>
            <button className="confirmation-primary" type="button" onClick={() => setStep("confirm")}>Yes, confirm my spot</button>
          </>
        ) : (
          <>
            <button className="confirmation-cancel" type="button" disabled={pending} onClick={() => setStep("choose")}>Back</button>
            <form action={submitResponse}>
              <input type="hidden" name="applicationId" value={applicationId} />
              <input type="hidden" name="response" value={step === "confirm" ? "confirmed" : "released"} />
              <input type="hidden" name="agreementsConfirmed" value={step === "confirm" && allChecked ? "true" : "false"} />
              <button
                className={step === "confirm" ? "confirmation-primary" : "confirmation-danger"}
                type="submit"
                disabled={pending || (step === "confirm" && !allChecked)}
              >
                {pending ? "Saving…" : step === "confirm" ? "Confirm my spot" : "Release my spot"}
              </button>
            </form>
          </>
        )}
      >
        {step === "confirm" && (
          <div className="rsvp-agreements">
            {agreements.map((agreement) => (
              <label key={agreement.id}>
                <input
                  type="checkbox"
                  checked={checked.has(agreement.id)}
                  onChange={(event) => setChecked((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(agreement.id);
                    else next.delete(agreement.id);
                    return next;
                  })}
                />
                <span>{agreement.label.replace(/^Agreement:\s*/i, "")}</span>
              </label>
            ))}
          </div>
        )}
        {state.status === "error" && <p className="rsvp-error" role="alert">{state.message}</p>}
      </ConfirmationDialog>
    </>
  );
}
