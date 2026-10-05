"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireApplicationAdmin } from "@/lib/application-admin";
import { deliverApplicationEmail } from "@/lib/application-email";

function value(formData: FormData, name: string) {
  const field = formData.get(name);
  return typeof field === "string" ? field.trim() : "";
}

function applicationId(formData: FormData) {
  const id = Number(value(formData, "applicationId"));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function detailPath(id: number, message?: string) {
  return `/admin/applications/${id}${message ? `?message=${encodeURIComponent(message)}` : ""}`;
}

export async function stageApplicationDecision(formData: FormData) {
  const id = applicationId(formData);
  const decision = value(formData, "decision");
  if (!id || !["accepted", "rejected"].includes(decision)) redirect("/admin/applications");

  const { supabase, userId } = await requireApplicationAdmin(detailPath(id));
  const { error } = await supabase.from("application_events").insert({
    application_id: id,
    actor_id: userId,
    event_type: "decision_staged",
    details: { decision },
  });

  if (error) {
    console.error("Unable to stage decision", error.code, error.message);
    redirect(detailPath(id, "stage-failed"));
  }

  revalidatePath("/admin/applications");
  revalidatePath(detailPath(id));
  redirect(detailPath(id, "staged"));
}

export async function publishApplicationDecision(formData: FormData) {
  const id = applicationId(formData);
  if (!id) redirect("/admin/applications");

  const { supabase } = await requireApplicationAdmin(detailPath(id));
  const { data: staged } = await supabase
    .from("application_events")
    .select("details")
    .eq("application_id", id)
    .eq("event_type", "decision_staged")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  const decision = staged?.details && typeof staged.details === "object" && !Array.isArray(staged.details)
    ? staged.details.decision
    : null;

  if (decision !== "accepted" && decision !== "rejected") {
    redirect(detailPath(id, "stage-required"));
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
    redirect(detailPath(id, "publish-failed"));
  }

  if (publishedApplication) {
    await deliverApplicationEmail(
      supabase,
      publishedApplication.id,
      decision === "accepted" ? "acceptance" : "rejection",
    );
  }

  revalidatePath("/admin/applications");
  revalidatePath(detailPath(id));
  revalidatePath("/dashboard");
  redirect(detailPath(id, "published"));
}

export async function reopenApplication(formData: FormData) {
  const id = applicationId(formData);
  if (!id) redirect("/admin/applications");

  const { supabase } = await requireApplicationAdmin(detailPath(id));
  const { error } = await supabase
    .from("applications")
    .update({ submission_state: "draft" })
    .eq("id", id)
    .eq("submission_state", "submitted");

  if (error) {
    console.error("Unable to reopen application", error.code, error.message);
    redirect(detailPath(id, "reopen-failed"));
  }

  revalidatePath("/admin/applications");
  revalidatePath(detailPath(id));
  revalidatePath("/dashboard");
  redirect("/admin/applications?message=reopened");
}
