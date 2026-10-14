import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

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
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  const errorPath = type === "recovery"
    ? "/login?forgot=1&error=recovery"
    : "/login?error=confirmation";
  return NextResponse.redirect(new URL(errorPath, url.origin));
}
