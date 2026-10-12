"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requireApplicationAdmin,
  requireApplicationStaff,
} from "@/lib/application-admin";
import { deliverApplicationEmail } from "@/lib/application-email";
import { publishConfirmationPhrase } from "@/lib/applications";

function value(formData: FormData, name: string) {
  const field = formData.get(name);
  return typeof field === "string" ? field.trim() : "";
}

function applicationId(formData: FormData) {
  const id = Number(value(formData, "applicationId"));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function portalPath(options: {
  message?: string;
  applicationId?: number;
  count?: number;
  emailPending?: number;
  position?: string;
} = {}) {
  const params = new URLSearchParams();
  if (options.message) params.set("message", options.message);
  if (options.applicationId) params.set("application", String(options.applicationId));
  if (options.count !== undefined) params.set("count", String(options.count));
  if (options.emailPending) params.set("emailPending", String(options.emailPending));
  if (options.position) params.set("position", options.position);
  const query = params.toString();
  return `/admin/applications${query ? `?${query}` : ""}`;
}

export async function stageApplicationDecision(formData: FormData) {
  const id = applicationId(formData);
  const decision = value(formData, "decision");
  const position = value(formData, "returnPosition") || undefined;
  if (!id || !["accepted", "rejected"].includes(decision)) redirect("/admin/applications");

  const { supabase, userId } = await requireApplicationStaff(portalPath({ applicationId: id, position }));
  const { error } = await supabase.from("application_events").insert({
    application_id: id,
    actor_id: userId,
    event_type: "decision_staged",
    details: { decision },
  });

  if (error) {
    console.error("Unable to stage decision", error.code, error.message);
    redirect(portalPath({ message: "stage-failed", applicationId: id, position }));
  }

  revalidatePath("/admin/applications");
  redirect(portalPath({ message: "staged", position }));
}

export async function publishApplicationDecision(formData: FormData) {
  const id = applicationId(formData);
  const position = value(formData, "returnPosition") || undefined;
  if (!id) redirect("/admin/applications");

  const { supabase } = await requireApplicationAdmin(portalPath({ applicationId: id, position }));
  const { data: application } = await supabase
    .from("applications")
    .select("submitted_at")
    .eq("id", id)
    .eq("submission_state", "submitted")
    .eq("published_decision", "undecided")
    .maybeSingle();

  const { data: staged } = application?.submitted_at
    ? await supabase
      .from("application_events")
      .select("details")
      .eq("application_id", id)
      .eq("event_type", "decision_staged")
      .gte("created_at", application.submitted_at)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()
    : { data: null };
  const decision = staged?.details && typeof staged.details === "object" && !Array.isArray(staged.details)
    ? staged.details.decision
    : null;

  if (decision !== "accepted" && decision !== "rejected") {
    redirect(portalPath({ message: "stage-required", applicationId: id, position }));
  }

  const { data: publishedApplication, error } = await supabase
    .from("applications")
    .update({ published_decision: decision })
    .eq("id", id)
    .eq("submission_state", "submitted")
    .eq("published_decision", "undecided")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Unable to publish decision", error.code, error.message);
    redirect(portalPath({ message: "publish-failed", applicationId: id, position }));
  }

  if (publishedApplication) {
    await deliverApplicationEmail(
      supabase,
      publishedApplication.id,
      decision === "accepted" ? "acceptance" : "rejection",
    );
  }

  revalidatePath("/admin/applications");
  revalidatePath("/dashboard");
  redirect(portalPath({ message: "published", count: publishedApplication ? 1 : 0, position }));
}

export async function publishStagedDecisions(formData: FormData) {
  const openingSlug = value(formData, "openingSlug");
  const confirmation = value(formData, "confirmation");
  const returnPath = portalPath({ position: openingSlug || undefined });
  const { supabase } = await requireApplicationAdmin(returnPath);
  const { data: opening } = await supabase
    .from("application_openings")
    .select("id, slug, title")
    .eq("slug", openingSlug)
    .neq("status", "draft")
    .maybeSingle();

  if (!opening) {
    redirect(portalPath({ message: "opening-required" }));
  }

  if (confirmation !== publishConfirmationPhrase(opening.title)) {
    redirect(portalPath({ message: "confirmation-required", position: opening.slug }));
  }

  const { data: published, error } = await supabase.rpc(
    "publish_staged_application_decisions",
    { target_opening_id: opening.id },
  );
  if (error) {
    console.error("Unable to publish staged decisions", error.code, error.message);
    redirect(portalPath({ message: "publish-all-failed", position: opening.slug }));
  }

  if (!published || published.length === 0) {
    redirect(portalPath({ message: "no-staged", position: opening.slug }));
  }

  const deliveryResults = await Promise.all(
    published.map((application) => deliverApplicationEmail(
      supabase,
      application.application_id,
      application.decision === "accepted" ? "acceptance" : "rejection",
    )),
  );
  const emailPending = deliveryResults.filter((delivered) => !delivered).length;

  revalidatePath("/admin/applications");
  revalidatePath("/dashboard");
  redirect(portalPath({
    message: "published-all",
    count: published.length,
    emailPending,
    position: opening.slug,
  }));
}

export async function reopenApplication(formData: FormData) {
  const id = applicationId(formData);
  const position = value(formData, "returnPosition") || undefined;
  if (!id) redirect("/admin/applications");

  const { supabase } = await requireApplicationAdmin(portalPath({ applicationId: id, position }));
  const { error } = await supabase
    .from("applications")
    .update({ submission_state: "draft" })
    .eq("id", id)
    .eq("submission_state", "submitted");

  if (error) {
    console.error("Unable to reopen application", error.code, error.message);
    redirect(portalPath({ message: "reopen-failed", applicationId: id, position }));
  }

  revalidatePath("/admin/applications");
  revalidatePath("/dashboard");
  redirect(portalPath({ message: "reopened", position }));
}
