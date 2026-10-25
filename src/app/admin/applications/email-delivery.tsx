"use client";
import { useState, useTransition } from "react";
import { retryApplicationEmail } from "./actions";
import type { ApplicationReview } from "./application-review-types";

export function EmailDelivery({
  applicationId,
  initialEmails,
}: {
  applicationId: number;
  initialEmails: ApplicationReview["emails"];
}) {
  const [emails, setEmails] = useState(initialEmails);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  async function refresh() {
    const response = await fetch(`/api/admin/applications/${applicationId}`, {
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(
        "Unable to refresh delivery status. Close and reopen this review.",
      );
    const review = (await response.json()) as ApplicationReview;
    setEmails(review.emails);
  }
  return (
    <section className="admin-email-delivery">
      <div className="admin-drawer-section-heading">
        <p className="section-label">Notifications</p>
        <h3>Email delivery</h3>
      </div>
      <div className="admin-email-items">
        {!emails.length && <p>No notifications have been queued.</p>}
        {emails.map((email) => (
          <article key={email.id}>
            <div>
              <strong>{email.template_key.replaceAll("_", " ")}</strong>
              <span>
                {email.status === "sent"
                  ? "Accepted by email provider"
                  : email.status === "uncertain"
                    ? "Delivery unknown — check Brevo before retrying"
                    : email.status === "failed" && email.attempts >= 5
                      ? "Failed — retry limit reached"
                      : email.status}
              </span>
            </div>
            <p>
              {email.status === "sent" && email.attempts === 0
                ? "Attempts were not recorded for this older email."
                : `${email.attempts} delivery attempt${email.attempts === 1 ? "" : "s"}.`}
              {email.status === "failed" && email.attempts < 5
                ? " Automatic retry scheduled."
                : ""}
            </p>
            {email.last_error && <p>{email.last_error}</p>}
            {(email.status === "failed" || email.status === "uncertain") && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      const result = await retryApplicationEmail(email.id);
                      setMessage(result.message);
                      await refresh();
                    } catch {
                      setMessage(
                        "Unable to retry or refresh delivery. Close and reopen this review.",
                      );
                    }
                  })
                }
              >
                {pending ? "Retrying…" : "Retry email"}
              </button>
            )}
          </article>
        ))}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                await refresh();
                setMessage("Delivery status updated.");
              } catch {
                setMessage(
                  "Unable to refresh delivery status. Close and reopen this review.",
                );
              }
            })
          }
        >
          Refresh delivery status
        </button>
        {message && <p role="status">{message}</p>}
      </div>
    </section>
  );
}
