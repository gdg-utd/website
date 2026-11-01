import { allowPasswordRecovery } from "@/lib/password-recovery";
import { safeNextPath } from "@/lib/navigation";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function onboardingPath(next: string) {
  return `/onboarding?next=${encodeURIComponent(next)}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const requestedNext = url.searchParams.get("next");
  const next = safeNextPath(requestedNext);
  // Existing recovery emails use next=/reset-password. New emails carry the
  // final destination separately to preserve compatibility with those links.
  const recoveryNext = safeNextPath(url.searchParams.get("returnTo"));
  const resetPath = recoveryNext === "/" ? "/reset-password" : `/reset-password?next=${encodeURIComponent(recoveryNext)}`;
  const recoveryError = `/login?forgot=1&error=recovery${recoveryNext !== "/" ? `&next=${encodeURIComponent(recoveryNext)}` : ""}`;

  // Email scanners and link previews follow GET requests. Never consume a
  // recovery token until the person explicitly submits the confirmation form.
  if (tokenHash && type === "recovery") {
    const confirmation = new URL("/auth/recovery", url.origin);
    confirmation.searchParams.set("token_hash", tokenHash);
    if (recoveryNext !== "/") confirmation.searchParams.set("next", recoveryNext);
    return NextResponse.redirect(confirmation);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (type === "recovery") {
        const { data: claims } = await supabase.auth.getClaims();
        const userId = claims?.claims?.sub;
        const sessionId = claims?.claims?.session_id;
        if (typeof userId !== "string" || typeof sessionId !== "string")
          return NextResponse.redirect(
            new URL(recoveryError, url.origin),
          );
        try {
          await allowPasswordRecovery(userId, sessionId);
        } catch {
          console.error(
            "Unable to authorize password recovery: signing configuration unavailable",
          );
          return NextResponse.redirect(
            new URL(recoveryError, url.origin),
          );
        }
        return NextResponse.redirect(new URL(resetPath, url.origin));
      }

      const { data } = await supabase.auth.getClaims();
      const userId =
        typeof data?.claims?.sub === "string" ? data.claims.sub : null;
      const { data: profile } = userId
        ? await supabase
            .from("profiles")
            .select("onboarding_completed_at")
            .eq("id", userId)
            .maybeSingle()
        : { data: null };
      const destination =
        profile && !profile.onboarding_completed_at
          ? onboardingPath(next)
          : next;
      return NextResponse.redirect(new URL(destination, url.origin));
    }
  }

  const errorPath =
    type === "recovery"
      ? recoveryError
      : "/login?error=confirmation";
  return NextResponse.redirect(new URL(errorPath, url.origin));
}
