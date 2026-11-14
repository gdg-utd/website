import {
  answerLabel,
  formatCentralDate,
  parseApplicationOpening,
  type ApplicationResponses,
} from "@/lib/applications";
import { describeResume } from "@/lib/resume-server";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationReview } from "@/app/admin/applications/application-review-types";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return Response.json({ error: "Invalid application." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { data: staffMember } = await supabase
    .from("application_admins")
    .select("user_id,role")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (!staffMember) {
    return Response.json(
      { error: "Application staff access required." },
      { status: 403 },
    );
  }

  const rawBefore = Number(
    new URL(request.url).searchParams.get("beforeEvent"),
  );
  const before =
    Number.isSafeInteger(rawBefore) && rawBefore > 0
      ? rawBefore
      : Number.MAX_SAFE_INTEGER;
  const [
    { data: application, error: applicationError },
    { data: events, error: eventsError },
    { data: rsvp, error: rsvpError },
    { data: delivery, error: deliveryError },
  ] = await Promise.all([
    supabase
      .from("applications")
      .select("*, application_openings(*)")
      .eq("id", id)
      .eq("submission_state", "submitted")
      .maybeSingle(),
    supabase
      .from("application_events")
      .select("id, actor_id, event_type, details, created_at")
      .eq("application_id", id)
      .lt("id", before)
      .order("id", { ascending: false })
      .limit(51),
    supabase
      .from("application_rsvps")
      .select("status, deadline_at, responded_at")
      .eq("application_id", id)
      .maybeSingle(),
    staffMember.role === "admin"
      ? supabase.rpc("application_email_status", { target_application_id: id })
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (applicationError || eventsError || rsvpError || deliveryError) {
    console.error(
      "Unable to load application review",
      applicationError?.code ??
        eventsError?.code ??
        rsvpError?.code ??
        deliveryError?.code,
    );
    return Response.json(
      { error: "Unable to load application review. Please try again." },
      { status: 500 },
    );
  }
  if (!application?.application_openings) {
    return Response.json({ error: "Application not found." }, { status: 404 });
  }

  const opening = parseApplicationOpening({
    ...application.application_openings,
    form_schema:
      application.form_schema_snapshot ??
      application.application_openings.form_schema,
  });
  const responses =
    application.responses &&
    typeof application.responses === "object" &&
    !Array.isArray(application.responses)
      ? (application.responses as ApplicationResponses)
      : {};
  const pageEvents = (events ?? []).slice(0, 50);
  const [{ data: stagedEvent, error: stageError }, { data: actors, error: actorError }] = await Promise.all([
    supabase
      .from("application_events")
      .select("details")
      .eq("application_id", id)
      .eq("event_type", "decision_staged")
      .gte("created_at", application.submitted_at ?? "1970-01-01")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
    pageEvents.length
      ? supabase.rpc("application_event_actors", {
        target_application_id: id,
        event_ids: pageEvents.map((event) => event.id),
      })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (actorError) console.error("Unable to load application audit actors", actorError.code);
  const actorNames = new Map(actors?.map((actor) => [actor.event_id, actor.actor_name]));
  if (stageError)
    return Response.json(
      { error: "Unable to load staged decision. Please try again." },
      { status: 500 },
    );
  const stagedDecision =
    stagedEvent?.details &&
    typeof stagedEvent.details === "object" &&
    !Array.isArray(stagedEvent.details) &&
    (stagedEvent.details.decision === "accepted" ||
      stagedEvent.details.decision === "rejected")
      ? stagedEvent.details.decision
      : undefined;

  const resume = describeResume(application.resume_path);
  const review: ApplicationReview = {
    id: application.id,
    applicantName: `${application.applicant_first_name} ${application.applicant_last_name}`,
    applicantEmail: application.applicant_email,
    openingSlug: opening.slug,
    openingTitle: opening.title,
    submittedLabel: formatCentralDate(application.submitted_at),
    formVersion: application.form_version,
    publishedDecision: application.published_decision,
    publishedLabel: formatCentralDate(application.decision_published_at),
    stagedDecision,
    rsvp: rsvp
      ? {
          status: rsvp.status as
            | "awaiting_response"
            | "confirmed"
            | "released"
            | "expired",
          deadlineLabel: formatCentralDate(rsvp.deadline_at),
          respondedLabel: rsvp.responded_at
            ? formatCentralDate(rsvp.responded_at)
            : undefined,
        }
      : undefined,
    sections: opening.form_schema.sections.map((section, index) => ({
      id: section.id,
      title: section.title,
      fields: [
        ...section.fields.map((field) => ({
          id: field.id,
          label: field.label,
          type: field.type,
          answer: answerLabel(field, responses[field.id]),
        })),
        ...(index === 0 && resume ? [{
          id: "submitted-resume",
          label: "Resume",
          type: "resume",
          answer: resume.name,
          resumePath: resume.path,
        }] : []),
      ],
    })),
    historyCursor: events && events.length > 50 ? events[49].id : null,
    emails: delivery ?? [],
    events: pageEvents.map((event) => {
      const eventDecision =
        event.details &&
        typeof event.details === "object" &&
        !Array.isArray(event.details)
          ? event.details.decision
          : null;
      const label =
        event.event_type === "submitted"
          ? "Application submitted"
          : event.event_type === "reopened"
            ? "Application reopened"
            : event.event_type === "rsvp_confirmed"
              ? "Spot confirmed"
              : event.event_type === "rsvp_released"
                ? "Spot released by applicant"
                : event.event_type === "rsvp_expired"
                  ? "RSVP expired"
                  : event.event_type === "post_interview_rejected"
                    ? "Marked not selected after interview"
                    : event.event_type === "decision_staged" &&
                        eventDecision === "cleared"
                      ? "Staged decision cleared"
                      : event.event_type === "decision_staged"
                        ? `${eventDecision === "accepted" ? "Acceptance" : "Not selected"} staged`
                        : `${eventDecision === "accepted" ? "Acceptance" : "Not selected"} published`;
      return {
        id: event.id,
        label,
        reason: event.event_type === "reopened" && event.details && typeof event.details === "object" && !Array.isArray(event.details) && typeof event.details.reason === "string"
          ? event.details.reason : undefined,
        createdLabel: formatCentralDate(event.created_at),
        actorName: actorNames.get(event.id) ?? (
          event.actor_id === application.applicant_id || event.event_type === "submitted"
            ? `${application.applicant_first_name} ${application.applicant_last_name}`
            : event.actor_id === null ? "System or deleted account" : "Name unavailable"
        ),
      };
    }),
  };

  return Response.json(review, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
