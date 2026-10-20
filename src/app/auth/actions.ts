"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPasswordStrength } from "@/lib/password";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export type ForgotPasswordActionState = AuthActionState;

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function passwordField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function safeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : "/";
}

function onboardingPath(next: string) {
  const destination = next === "/" ? "/dashboard" : next;
  return `/onboarding?next=${encodeURIComponent(destination)}`;
}

function authErrorMessage(message: string) {
  if (
    message.toLowerCase().includes("utdallas.edu") ||
    message.toLowerCase().includes("database error saving new user")
  ) {
    return "Use your UT Dallas email address to create an account.";
  }
  if (message.toLowerCase().includes("invalid login credentials")) {
    return "The email or password is incorrect.";
  }
  if (message.toLowerCase().includes("email not confirmed")) {
    return "Confirm your email before logging in.";
  }
  if (message.toLowerCase().includes("already registered")) {
    return "An account already exists for this email.";
  }
  return message;
}

export async function login(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = field(formData, "email");
  const password = passwordField(formData, "password");
  const next = safeNextPath(field(formData, "next"));

  if (!email || !password) {
    return { status: "error", message: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: authErrorMessage(error.message) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", signInData.user.id)
    .maybeSingle();

  if (profile && !profile.onboarding_completed_at) {
    redirect(onboardingPath(next));
  }

  redirect(next);
}

export async function signup(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const firstName = field(formData, "firstName");
  const lastName = field(formData, "lastName");
  const email = field(formData, "email").toLowerCase();
  const password = passwordField(formData, "password");
  const confirmPassword = passwordField(formData, "confirmPassword");
  const next = safeNextPath(field(formData, "next"));

  if (firstName.length < 1 || firstName.length > 50) {
    return { status: "error", message: "Enter your first name." };
  }
  if (lastName.length < 1 || lastName.length > 50) {
    return { status: "error", message: "Enter your last name." };
  }
  if (!/^[^@\s]+@utdallas\.edu$/i.test(email)) {
    return {
      status: "error",
      message: "Use your UT Dallas email address, such as dal123456@utdallas.edu.",
    };
  }
  if (!getPasswordStrength(password).isValid) {
    return {
      status: "error",
      message: "Use 8 or more characters with uppercase, lowercase, a number, and a symbol.",
    };
  }
  if (password !== confirmPassword) {
    return { status: "error", message: "The passwords do not match." };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const blacklistMessage = "Sorry, you cannot create an account because your email has been blacklisted by the GDG team. Please contact the GDG team if you believe this is incorrect.";
  const { data: blacklisted, error: blacklistError } = await supabase.rpc(
    "is_email_blacklisted",
    { candidate_email: email },
  );

  if (blacklistError || typeof blacklisted !== "boolean") {
    return {
      status: "error",
      message: "We could not check signup eligibility. Please try again shortly.",
    };
  }
  if (blacklisted) {
    return { status: "error", message: blacklistMessage };
  }

  const confirmationDestination = new URL(onboardingPath(next), siteUrl);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
      },
      emailRedirectTo: confirmationDestination.toString(),
    },
  });

  if (error) {
    // The list may have changed between our check and Auth's database insert.
    const { data: nowBlacklisted } = await supabase.rpc("is_email_blacklisted", {
      candidate_email: email,
    });
    if (nowBlacklisted) {
      return { status: "error", message: blacklistMessage };
    }
    return { status: "error", message: authErrorMessage(error.message) };
  }

  if (data.user?.identities?.length === 0) {
    return {
      status: "error",
      message: "An account already exists for this email. Log in instead.",
    };
  }

  if (!data.user) {
    return {
      status: "error",
      message: "We could not create your account. Please try again.",
    };
  }

  if (data.session) {
    redirect(onboardingPath(next));
  }

  const confirmationUrl = new URL("/auth/confirm", siteUrl);
  confirmationUrl.searchParams.set("email", email);
  confirmationUrl.searchParams.set("next", next === "/" ? "/dashboard" : next);
  redirect(`${confirmationUrl.pathname}${confirmationUrl.search}`);
}

export async function requestPasswordReset(
  _previousState: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  const email = field(formData, "email").toLowerCase();

  if (!/^[^@\s]+@utdallas\.edu$/i.test(email)) {
    return {
      status: "error",
      message: "Enter the UT Dallas email connected to your account.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.functions.invoke("request-password-reset", {
    body: { email },
  });

  if (error) {
    console.error("Unable to request a password reset", error.message);
    return {
      status: "error",
      message: "We could not start the password reset. Please try again shortly.",
    };
  }

  return {
    status: "success",
    message: "If an account exists for that email, a reset link is on its way. Check your junk folder too.",
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
