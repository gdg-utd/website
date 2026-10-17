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
  const next = requestedNext?.startsWith("/")
    && !requestedNext.startsWith("//")
    && !requestedNext.includes("\\")
    ? requestedNext
    : "/";

  if (code || (tokenHash && type === "recovery")) {
    const supabase = await createClient();
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: "recovery" });

    if (!error) {
      if (type === "recovery" || next.includes("recovery=1")) {
        return NextResponse.redirect(new URL(next, url.origin));
      }

      const { data } = await supabase.auth.getClaims();
      const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
      const { data: profile } = userId
        ? await supabase
          .from("profiles")
          .select("onboarding_completed_at")
          .eq("id", userId)
          .maybeSingle()
        : { data: null };
      const destination = profile && !profile.onboarding_completed_at
        ? onboardingPath(next)
        : next;
      return NextResponse.redirect(new URL(destination, url.origin));
    }
  }

  const errorPath = type === "recovery"
    ? "/login?forgot=1&error=recovery"
    : "/login?error=confirmation";
  return NextResponse.redirect(new URL(errorPath, url.origin));
}
