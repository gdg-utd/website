"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function safeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : "/";
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
  const password = field(formData, "password");
  const next = safeNextPath(field(formData, "next"));

  if (!email || !password) {
    return { status: "error", message: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: authErrorMessage(error.message) };
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
  const password = field(formData, "password");
  const confirmPassword = field(formData, "confirmPassword");
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
  if (password.length < 8) {
    return { status: "error", message: "Use at least 8 characters for your password." };
  }
  if (password !== confirmPassword) {
    return { status: "error", message: "The passwords do not match." };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const confirmationDestination = new URL(
    next === "/" ? "/?auth=confirmed" : next,
    siteUrl,
  );
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
    return { status: "error", message: authErrorMessage(error.message) };
  }

  if (data.session) {
    redirect(next === "/" ? "/?auth=welcome" : next);
  }

  const checkEmailUrl = new URL("/", siteUrl);
  checkEmailUrl.searchParams.set("auth", "check-email");
  if (next !== "/") checkEmailUrl.searchParams.set("next", next);
  redirect(`${checkEmailUrl.pathname}${checkEmailUrl.search}`);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
