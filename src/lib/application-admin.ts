import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireApplicationAdmin(returnPath = "/admin/applications") {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) redirect(`/login?next=${encodeURIComponent(returnPath)}`);

  const { data: administrator } = await supabase
    .from("application_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!administrator) redirect("/dashboard?admin=denied");

  return { supabase, userId };
}
