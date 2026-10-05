import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ApplicationEmailTemplate = "confirmation" | "acceptance" | "rejection";

export async function deliverApplicationEmail(
  supabase: SupabaseClient<Database>,
  applicationId: number,
  templateKey: ApplicationEmailTemplate,
) {
  const { error } = await supabase.functions.invoke("send-application-email", {
    body: { applicationId, templateKey },
  });

  if (error) {
    console.error(
      "Application email remains queued",
      applicationId,
      templateKey,
      error.message,
    );
    return false;
  }

  return true;
}

