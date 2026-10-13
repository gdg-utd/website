"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidUtdProgram } from "@/lib/utd-academic-programs";

function textField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function profilePath(message: string) {
  return `/dashboard/profile?message=${encodeURIComponent(message)}`;
}

function isValidEmail(value: string) {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidHttpUrl(value: string) {
  if (value.length > 2048) return false;

  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) redirect("/login?next=/dashboard/profile");

  const firstName = textField(formData, "firstName");
  const lastName = textField(formData, "lastName");
  const netId = textField(formData, "netId");
  const degree = textField(formData, "degree");
  const major = textField(formData, "major");
  const personalEmail = textField(formData, "personalEmail");
  const linkedinUrl = textField(formData, "linkedinUrl");
  const githubUrl = textField(formData, "githubUrl");
  const portfolioUrl = textField(formData, "portfolioUrl");

  if (!firstName || !lastName || firstName.length > 50 || lastName.length > 50) {
    redirect(profilePath("invalid-name"));
  }

  if (netId && !/^[A-Za-z0-9]{2,30}$/.test(netId)) {
    redirect(profilePath("invalid-netid"));
  }

  if ((degree || major) && !isValidUtdProgram(degree, major)) {
    redirect(profilePath("invalid-program"));
  }

  if (personalEmail && !isValidEmail(personalEmail)) {
    redirect(profilePath("invalid-email"));
  }

  if ([linkedinUrl, githubUrl, portfolioUrl].some((value) => value && !isValidHttpUrl(value))) {
    redirect(profilePath("invalid-url"));
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      net_id: netId || null,
      degree: degree || null,
      major: major || null,
      personal_email: personalEmail ? personalEmail.toLowerCase() : null,
      linkedin_url: linkedinUrl || null,
      github_url: githubUrl || null,
      portfolio_url: portfolioUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id")
    .single();

  if (error) {
    console.error("Unable to update profile", error.code, error.message);
    redirect(profilePath("failed"));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  redirect(profilePath("saved"));
}
