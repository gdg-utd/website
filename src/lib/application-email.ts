import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ApplicationEmailTemplate =
  | "confirmation"
  | "acceptance"
  | "rejection"
  | "officer_update"
  | "rsvp_expired";

export async function deliverApplicationEmail(
  supabase: SupabaseClient<Database>,
  applicationId: number,
  templateKey: ApplicationEmailTemplate,
) {
  const { data, error } = await supabase.functions.invoke("send-application-email", {
    body: { applicationId, templateKey },
  });

  if (error || data?.sent !== true) {
    console.error(
      "Application email remains queued",
      applicationId,
      templateKey,
      error?.message ?? "Delivery has not been acknowledged yet",
    );
    return false;
  }

  return true;
}

