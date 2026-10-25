"use server";

import {
  canRecoverPassword,
  clearPasswordRecovery,
  clearLocalAuthCookies,
} from "@/lib/password-recovery";
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

async function savePassword(
  mode: "profile" | "recovery",
  _previousState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const password = passwordField(formData, "password");
  const confirmation = passwordField(formData, "confirmPassword");

  if (password.length > 128 || !getPasswordStrength(password).isValid) {
    return {
      status: "error",
      message:
        "Use 8 to 128 characters with uppercase, lowercase, a number, and a symbol.",
    };
  }
  if (password !== confirmation) {
    return { status: "error", message: "The passwords do not match." };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      status: "error",
      message:
        "Your session has expired. Request a new reset link from the login page.",
    };
  }

  if (mode === "recovery") {
    const { data: claims } = await supabase.auth.getClaims();
    const sessionId = claims?.claims?.session_id;
    if (
      typeof sessionId !== "string" ||
      !(await canRecoverPassword(userData.user.id, sessionId))
    )
      return {
        status: "error",
        message:
          "Your reset link is invalid or has expired. Request a new link.",
      };
  }
  const currentPassword = passwordField(formData, "currentPassword");
  if (mode === "profile") {
    if (!currentPassword || !userData.user.email)
      return { status: "error", message: "Enter your current password." };
    const { data: signedIn, error: currentError } =
      await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password: currentPassword,
      });
    if (currentError || signedIn.user?.id !== userData.user.id)
      return {
        status: "error",
        message: "Your current password is incorrect.",
      };
  }

  const { error } = await supabase.auth.updateUser(
    mode === "profile"
      ? { password, current_password: currentPassword }
      : { password },
  );
  if (error) {
    const message = error.message.toLowerCase();
    const isCurrentPassword =
      error.code === "same_password" ||
      message.includes("same password") ||
      message.includes("different from the old password");

    return {
      status: "error",
      message: isCurrentPassword
        ? "Password not changed. That is already your current password. Choose a different password."
        : message.includes("reauth") || message.includes("session")
          ? "Password not changed. Your session has expired. Request a new reset link from the login page."
          : "Password not changed. We could not update it. Please try again.",
    };
  }

  await clearPasswordRecovery();
  const { error: signOutError } = await supabase.auth.signOut({
    scope: mode === "profile" ? "others" : "global",
  });
  if (signOutError) {
    console.error(
      "Unable to end sessions after a password change",
      signOutError.message,
    );
  }

  if (mode === "profile")
    redirect(
      signOutError
        ? "/dashboard/profile?message=password-updated-sessions-warning"
        : "/dashboard/profile?message=password-updated",
    );
  if (signOutError) await supabase.auth.signOut({ scope: "local" });
  await clearLocalAuthCookies();
  redirect(
    signOutError
      ? "/login?password=updated-sessions-warning"
      : "/login?password=updated",
  );
}

export async function changePassword(
  previous: PasswordActionState,
  formData: FormData,
) {
  return savePassword("profile", previous, formData);
}

export async function recoverPassword(
  previous: PasswordActionState,
  formData: FormData,
) {
  return savePassword("recovery", previous, formData);
}
