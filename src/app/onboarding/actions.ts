"use server";

import { safeNextPath } from "@/lib/navigation";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidUtdProgram } from "@/lib/utd-academic-programs";

export type OnboardingActionState = {
  status: "idle" | "error";
  message: string;
};

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function onboardingNextPath(value: string | string[] | undefined) {
  const next = safeNextPath(value, "/dashboard");
  return next.startsWith("/onboarding") ? "/dashboard" : next;
}

function isValidHttpUrl(value: string) {
  if (!value || value.length > 2048) return false;

  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export async function completeOnboarding(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const next = onboardingNextPath(field(formData, "next"));
  const netId = field(formData, "netId");
  const degree = field(formData, "degree");
  const major = field(formData, "major");
  const githubUrl = field(formData, "githubUrl");
  const portfolioUrl = field(formData, "portfolioUrl");
  const linkedinUrl = field(formData, "linkedinUrl");

  if (!/^[A-Za-z0-9]{2,30}$/.test(netId)) {
    return { status: "error", message: "Enter a valid UT Dallas NetID using letters and numbers." };
  }

  if (!isValidUtdProgram(degree, major)) {
    return { status: "error", message: "Select your UT Dallas degree and major." };
  }

  if ([githubUrl, portfolioUrl, linkedinUrl].some((url) => url && !isValidHttpUrl(url))) {
    return { status: "error", message: "Enter complete links beginning with http:// or https://." };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (!userId) redirect(`/login?next=${encodeURIComponent(`/onboarding?next=${encodeURIComponent(next)}`)}`);

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      net_id: netId,
      degree,
      major,
      github_url: githubUrl || null,
      portfolio_url: portfolioUrl || null,
      linkedin_url: linkedinUrl || null,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id")
    .single();

  if (error || !profile) {
    console.error("Unable to complete onboarding", error?.code, error?.message);
    return { status: "error", message: "We could not save your profile. Please try again." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  redirect(next);
}
