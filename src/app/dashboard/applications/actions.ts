"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RsvpResponseState = {
  status: "idle" | "success" | "error";
  rsvpStatus?: "confirmed" | "released";
  message?: string;
};

export const initialRsvpResponseState: RsvpResponseState = { status: "idle" };

function value(formData: FormData, name: string) {
  const field = formData.get(name);
  return typeof field === "string" ? field.trim() : "";
}

export async function respondToMenteeOffer(
  _previousState: RsvpResponseState,
  formData: FormData,
): Promise<RsvpResponseState> {
  const applicationId = Number(value(formData, "applicationId"));
  const response = value(formData, "response");
  const agreementsConfirmed = value(formData, "agreementsConfirmed") === "true";

  if (!Number.isSafeInteger(applicationId) || applicationId <= 0) {
    return { status: "error", message: "This offer could not be found." };
  }
  if (response !== "confirmed" && response !== "released") {
    return { status: "error", message: "Choose whether to confirm or release your spot." };
  }
  if (response === "confirmed" && !agreementsConfirmed) {
    return { status: "error", message: "Review and check every agreement before confirming your spot." };
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims?.sub) {
    return { status: "error", message: "Your session expired. Sign in and try again." };
  }

  const { data, error } = await supabase.rpc("respond_to_mentee_offer", {
    target_application_id: applicationId,
    response,
    agreements_confirmed: agreementsConfirmed,
  });

  if (error || !data?.[0]) {
    if (error) console.error("Unable to record mentee RSVP", error.code, error.message);
    const message = error?.message.includes("72-hour")
      ? "The 72-hour response window has closed."
      : error?.message.includes("already been recorded")
        ? "A response has already been recorded for this offer."
        : "Your response could not be saved. Please try again.";
    return { status: "error", message };
  }

  revalidatePath("/dashboard/applications");
  revalidatePath("/admin/applications");
  return {
    status: "success",
    rsvpStatus: data[0].rsvp_status === "released" ? "released" : "confirmed",
  };
}
