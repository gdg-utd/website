"use server";

import { revalidatePath } from "next/cache";
import { storeResume } from "@/lib/resume-server";
import { createClient } from "@/lib/supabase/server";

export async function updateProfileResume(_previous: { message: string; error: boolean }, formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { message: "Sign in again to update your résumé.", error: true };

  let path: string | null = null;
  const removing = formData.get("intent") === "remove";
  if (!removing) {
    const uploaded = await storeResume(supabase, userId, formData.get("resume"));
    if (!uploaded.resume) return { message: uploaded.error, error: true };
    path = uploaded.resume.path;
  }

  const { error } = await supabase.from("profiles")
    .update({ resume_path: path })
    .eq("id", userId)
    .select("id")
    .single();

  if (error) {
    console.error("Unable to update profile résumé", error.code);
    return { message: "We could not update your profile résumé. Please try again.", error: true };
  }
  revalidatePath("/dashboard/profile");
  revalidatePath("/apply/[slug]", "page");
  return { message: removing ? "Default résumé removed." : "Default résumé saved.", error: false };
}
