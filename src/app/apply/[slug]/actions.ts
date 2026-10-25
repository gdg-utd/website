"use server";

import { editFormError, type EditFormState } from "@/lib/edit-form-state";
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

export async function saveApplication(previous: EditFormState, formData: FormData) {
  const slug = textField(formData, "openingSlug");
  const intent = textField(formData, "intent") === "submit" ? "submit" : "save";
  const returnPath = applicationPath(slug || "sprint-mentee");
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  }

  const { data: openingData, error: openingError } = await supabase
    .from("application_openings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (openingError || !openingData) {
    console.error("Unable to load application opening", openingError?.code ?? "missing-opening");
    return editFormError(previous, formData, "We could not load this opening. Please try again.");
  }

  const opening = parseApplicationOpening(openingData);
  if (Number(textField(formData,"openingVersion")) !== opening.form_version) {
    return editFormError(previous,formData,"This form changed while you were editing. Keep a copy of your responses, then reload the page to use the updated questions.");
  }
  if (!isOpeningAccepting(opening)) {
    return editFormError(previous, formData, "This application is not currently accepting responses.");
  }

  const responses = buildResponses(opening.form_schema, formData);
  if (JSON.stringify(responses).length > 60_000) {
    return editFormError(previous, formData, "Your responses are too long. Shorten them and try again.");
  }

  const invalidFields = validateResponses(opening.form_schema, responses);
  if (intent === "submit" && invalidFields.length > 0) {
    return editFormError(previous, formData, `Check these fields: ${invalidFields.join(", ")}.`);
  }

  const { data: existing, error: existingError } = await supabase
    .from("applications")
    .select("id, submission_state")
    .eq("opening_id", opening.id)
    .eq("applicant_id", userId)
    .maybeSingle();

  if (existingError) {
    console.error("Unable to load existing application", existingError.code);
    return editFormError(previous, formData, "We could not check your saved application. Please try again.");
  }
  if (existing?.submission_state === "submitted") {
    return editFormError(previous, formData, "This application has already been submitted.");
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
    return editFormError(previous, formData, "We could not save your application. Please try again.");
  }

  revalidatePath("/apply");
  revalidatePath(`/apply/${slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/applications");

  if (intent === "submit") {
    if (savedApplicationId) {
      await deliverApplicationEmail(supabase, savedApplicationId, "confirmation");
    }
    redirect(`/dashboard/applications?submitted=${encodeURIComponent(slug)}`);
  }
  redirect(applicationPath(slug, "saved"));
}
