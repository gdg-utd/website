"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/navigation";
import { allowPasswordRecovery } from "@/lib/password-recovery";
import { createClient } from "@/lib/supabase/server";

export async function confirmRecovery(form: FormData) {
  const next = safeNextPath(form.get("next")?.toString());
  const errorPath = `/login?forgot=1&error=recovery${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`;
  const token = form.get("tokenHash");
  if (typeof token !== "string" || !token || token.length > 512) redirect(errorPath);
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: "recovery" });
  if (error) redirect(errorPath);
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const sessionId = data?.claims?.session_id;
  if (typeof userId !== "string" || typeof sessionId !== "string") redirect(errorPath);
  try {
    await allowPasswordRecovery(userId, sessionId);
  } catch {
    console.error("Unable to authorize password recovery: signing configuration unavailable");
    redirect(errorPath);
  }
  redirect(next === "/" ? "/reset-password" : `/reset-password?next=${encodeURIComponent(next)}`);
}
