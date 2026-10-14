"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPasswordStrength } from "@/lib/password";

export type PasswordActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

function passwordField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function updatePassword(
  _previousState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const password = passwordField(formData, "password");
  const confirmation = passwordField(formData, "confirmPassword");

  if (password.length > 128 || !getPasswordStrength(password).isValid) {
    return {
      status: "error",
      message: "Use 8 to 128 characters with uppercase, lowercase, a number, and a symbol.",
    };
  }
  if (password !== confirmation) {
    return { status: "error", message: "The passwords do not match." };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return {
      status: "error",
      message: "Your session has expired. Request a new reset link from the login page.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const message = error.message.toLowerCase();
    const isCurrentPassword = error.code === "same_password"
      || message.includes("same password")
      || message.includes("different from the old password");

    return {
      status: "error",
      message: isCurrentPassword
        ? "Password not changed. That is already your current password. Choose a different password."
        : message.includes("reauth") || message.includes("session")
          ? "Password not changed. Your session has expired. Request a new reset link from the login page."
          : "Password not changed. We could not update it. Please try again.",
    };
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
  if (signOutError) {
    console.error("Unable to end sessions after a password change", signOutError.message);
  }

  redirect("/login?password=updated");
}
