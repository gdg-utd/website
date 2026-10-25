import { DataUnavailable } from "@/components/data-unavailable";
import { normalizeQuery } from "@/lib/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { applicantStatus, formatCentralDate, parseApplicationOpening } from "@/lib/applications";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { RsvpOffer } from "./rsvp-offer";

export const metadata: Metadata = { title: "Your applications" };

type ApplicationsPageProps = {
  searchParams: Promise<{ submitted?: string }>;
};

function applicationRsvp(
  value: Tables<"application_rsvps"> | Tables<"application_rsvps">[] | null,
) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const query = normalizeQuery(await searchParams);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) redirect("/login?next=/dashboard/applications");

  const { data: applications, error } = await supabase
    .from("applications")
    .select("id, opening_id, submission_state, submitted_at, published_decision, decision_published_at, updated_at, form_schema_snapshot, application_openings(*), application_rsvps(*)")
    .eq("applicant_id", userId)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("Unable to load applicant applications", error.code);
    return <DataUnavailable href="/dashboard/applications" label="your applications" />;
  }
  // This authenticated, dynamic page needs the wall clock to close fixed RSVP windows.
  // eslint-disable-next-line react-hooks/purity
  const currentTime = Date.now();

  return (
    <>
      <header className="dashboard-page-heading">
        <div>
          <p className="section-label">Your progress</p>
          <h1>Applications</h1>
          <p>Continue drafts and view updates on submitted applications.</p>
        </div>
        <Link className="dashboard-heading-link" href="/apply">View open positions <span aria-hidden="true">→</span></Link>
      </header>

      {query.submitted && (
        <p className="dashboard-notice" role="status"><span aria-hidden="true">✓</span>Your application was submitted.</p>
      )}

      {applications && applications.length > 0 ? (
        <div className="dashboard-applications">
          {applications.map((application) => {
            const opening = application.application_openings
              ? parseApplicationOpening({...application.application_openings,form_schema:application.submission_state === "submitted" ? application.form_schema_snapshot ?? application.application_openings.form_schema : application.application_openings.form_schema})
              : null;
            const rsvp = applicationRsvp(application.application_rsvps);
            const baseStatus = applicantStatus(application.submission_state, application.published_decision);
            const status = rsvp?.status === "released" || rsvp?.status === "expired"
              ? "Not selected"
              : baseStatus === "Accepted" && opening?.slug !== "sprint-mentee"
                ? "Selected"
                : baseStatus;
            const agreements = opening?.form_schema.sections
              .flatMap((section) => section.fields)
              .filter((field) => field.type === "checkbox" && field.required)
              .map((field) => ({ id: field.id, label: field.label })) ?? [];
            return (
              <article className={`dashboard-application dashboard-application-${opening?.accent ?? "blue"}`} key={application.id}>
                <div>
                  <p>{opening?.eyebrow ?? "Application"}</p>
                  <h2>{opening?.title ?? "GDG UTDallas application"}</h2>
                </div>
                <div className="dashboard-application-meta">
                  <span className={`application-status application-status-${status.toLowerCase().replace(" ", "-")}`}>{status}</span>
                  <p>{application.submission_state === "draft" ? "Last saved" : application.decision_published_at ? "Decision posted" : "Submitted"}</p>
                  <time>{formatCentralDate(application.decision_published_at ?? application.submitted_at ?? application.updated_at)} CT</time>
                </div>
                {application.submission_state === "draft" ? (
                  <Link href={`/apply/${opening?.slug ?? ""}`}>Continue application <span aria-hidden="true">→</span></Link>
                ) : rsvp ? (
                  <RsvpOffer
                    applicationId={application.id}
                    initialStatus={rsvp.status as "awaiting_response" | "confirmed" | "released" | "expired"}
                    deadlineAt={rsvp.deadline_at}
                    deadlinePassed={Date.parse(rsvp.deadline_at) <= currentTime}
                    agreements={agreements}
                  />
                ) : (
                  <p className="dashboard-application-note">
                    {status === "Submitted"
                      ? "Your application is under review. Updates will appear here and be sent to your email."
                      : status === "Selected"
                        ? "Your application is moving to the interview stage. Watch for scheduling details from our team."
                        : status === "Accepted"
                          ? "You have been accepted. Check your email for next steps."
                        : "Thank you for applying and for your interest in GDG UTDallas."}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="dashboard-empty-state">
          <h2>No applications yet.</h2>
          <p>Applications will appear here after you save or submit one.</p>
          <Link className="primary-link" href="/apply">View applications <span aria-hidden="true">→</span></Link>
        </div>
      )}
    </>
  );
}
