"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function safeNextPath(value: string) {
  const siteUrl = new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  );

  try {
    const destination = new URL(value, siteUrl);

    if (destination.origin !== siteUrl.origin) return "/?auth=confirmed";

    return `${destination.pathname}${destination.search}`;
  } catch {
    return "/?auth=confirmed";
  }
}

export async function confirmEmail(formData: FormData) {
  const tokenHash = field(formData, "tokenHash");
  const type = field(formData, "type");
  const next = safeNextPath(field(formData, "next"));

  if (!tokenHash || type !== "email") {
    redirect("/auth/confirm?error=invalid");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (error) {
    redirect("/auth/confirm?error=invalid");
  }

  redirect(next);
}
