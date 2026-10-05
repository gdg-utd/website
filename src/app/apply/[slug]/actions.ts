"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildResponses,
  isOpeningAccepting,
  parseApplicationOpening,
  validateResponses,
} from "@/lib/applications";
import { deliverApplicationEmail } from "@/lib/application-email";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

function textField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function applicationPath(slug: string, message?: string) {
  const path = `/apply/${encodeURIComponent(slug)}`;
  return message ? `${path}?message=${encodeURIComponent(message)}` : path;
}

export async function saveApplication(formData: FormData) {
  const slug = textField(formData, "openingSlug");
  const intent = textField(formData, "intent") === "submit" ? "submit" : "save";
  const returnPath = applicationPath(slug || "sprint-mentee");
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  }

  const { data: openingData } = await supabase
    .from("application_openings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!openingData) redirect("/apply");

  const opening = parseApplicationOpening(openingData);
  if (!isOpeningAccepting(opening)) {
    redirect(applicationPath(slug, "closed"));
  }

  const responses = buildResponses(opening.form_schema, formData);
  if (JSON.stringify(responses).length > 60_000) {
    redirect(applicationPath(slug, "too-large"));
  }

  if (intent === "submit" && validateResponses(opening.form_schema, responses).length > 0) {
    redirect(applicationPath(slug, "incomplete"));
  }

  const { data: existing } = await supabase
    .from("applications")
    .select("id, submission_state")
    .eq("opening_id", opening.id)
    .eq("applicant_id", userId)
    .maybeSingle();

  if (existing?.submission_state === "submitted") {
    redirect(applicationPath(slug, "locked"));
  }

  const submissionState = intent === "submit" ? "submitted" : "draft";
  let error;
  let savedApplicationId = existing?.id;

  if (existing) {
    const result = await supabase
      .from("applications")
      .update({ responses, submission_state: submissionState })
      .eq("id", existing.id)
      .select("id")
      .single();
    error = result.error;
    savedApplicationId = result.data?.id;
  } else {
    const insert = {
      opening_id: opening.id,
      applicant_id: userId,
      responses,
      submission_state: submissionState,
    } as unknown as Database["public"]["Tables"]["applications"]["Insert"];
    const result = await supabase.from("applications").insert(insert).select("id").single();
    error = result.error;
    savedApplicationId = result.data?.id;
  }

  if (error) {
    console.error("Unable to save application", error.code, error.message);
    redirect(applicationPath(slug, "failed"));
  }

  revalidatePath("/apply");
  revalidatePath(`/apply/${slug}`);
  revalidatePath("/dashboard");

  if (intent === "submit") {
    if (savedApplicationId) {
      await deliverApplicationEmail(supabase, savedApplicationId, "confirmation");
    }
    redirect(`/dashboard?submitted=${encodeURIComponent(slug)}`);
  }
  redirect(applicationPath(slug, "saved"));
}
