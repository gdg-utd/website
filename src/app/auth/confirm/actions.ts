"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ConfirmationActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

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

function isUtdEmail(email: string) {
  return /^[^@\s]+@utdallas\.edu$/i.test(email);
}

export async function confirmEmailCode(
  _previousState: ConfirmationActionState,
  formData: FormData,
): Promise<ConfirmationActionState> {
  const email = field(formData, "email").toLowerCase();
  const token = field(formData, "token");
  const next = safeNextPath(field(formData, "next"));

  if (!isUtdEmail(email)) {
    return {
      status: "error",
      message: "This confirmation request is missing a valid UT Dallas email.",
    };
  }

  if (!/^\d{6}$/.test(token)) {
    return { status: "error", message: "Enter the six-digit code from your email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return {
      status: "error",
      message: "That code is invalid or has expired. Check the code and try again.",
    };
  }

  redirect(next);
}

export async function resendConfirmationCode(
  _previousState: ConfirmationActionState,
  formData: FormData,
): Promise<ConfirmationActionState> {
  const email = field(formData, "email").toLowerCase();
  const next = safeNextPath(field(formData, "next"));

  if (!isUtdEmail(email)) {
    return {
      status: "error",
      message: "This confirmation request is missing a valid UT Dallas email.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const confirmationDestination = new URL(next, siteUrl);
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: confirmationDestination.toString(),
    },
  });

  if (error) {
    const rateLimited =
      error.message.toLowerCase().includes("rate limit") ||
      error.message.toLowerCase().includes("security purposes");

    return {
      status: "error",
      message: rateLimited
        ? "Please wait before requesting another code."
        : "We could not send another code. Please try again shortly.",
    };
  }

  return {
    status: "success",
    message: "A new code was sent. It may take a few minutes to arrive; check your junk folder too.",
  };
}
