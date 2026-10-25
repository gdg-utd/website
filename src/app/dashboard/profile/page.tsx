import { DataUnavailable } from "@/components/data-unavailable";
import { normalizeQuery } from "@/lib/navigation";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";
import { createClient } from "@/lib/supabase/server";
import { PasswordResetSection } from "./password-reset-section";

export const metadata: Metadata = { title: "Your profile" };

type ProfilePageProps = {
  searchParams: Promise<{ message?: string; recovery?: string }>;
};

const messages: Record<string, { text: string; error?: boolean }> = {
  "password-updated-sessions-warning": {
    text: "Your password was updated, but we could not sign out other sessions. Contact the GDG team if you need help securing your account.",
    error: true,
  },
  "password-updated": { text: "Your password was updated." },
  saved: { text: "Your profile was updated." },
  "invalid-name": { text: "Enter a valid first and last name.", error: true },
  "invalid-netid": {
    text: "Enter a valid NetID using letters and numbers only.",
    error: true,
  },
  "invalid-program": {
    text: "Select a valid UT Dallas degree and major.",
    error: true,
  },
  "invalid-email": {
    text: "Enter a valid personal email address.",
    error: true,
  },
  "invalid-url": {
    text: "Enter complete links beginning with http:// or https://.",
    error: true,
  },
  failed: {
    text: "We could not update your profile. Please try again.",
    error: true,
  },
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const query = normalizeQuery(await searchParams);
  if (query.recovery === "1") redirect("/reset-password");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = claims?.sub;

  if (!userId) redirect("/login?next=/dashboard/profile");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, net_id, degree, major, personal_email, linkedin_url, github_url, portfolio_url",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    console.error("Unable to load profile", error?.code ?? "missing-profile");
    return <DataUnavailable href="/dashboard/profile" label="your profile" />;
  }
  const email = typeof claims?.email === "string" ? claims.email : "";
  const message = query.message ? messages[query.message] : undefined;

  return (
    <>
      <header className="dashboard-page-heading">
        <div>
          <p className="section-label">Your details</p>
          <h1>Profile</h1>
          <p>
            Keep your information up to date. Optional fields can be completed
            now or later.
          </p>
        </div>
      </header>

      {message && (
        <p
          className={`dashboard-notice${message.error ? " dashboard-notice-error" : ""}`}
          role="status"
        >
          {!message.error && <span aria-hidden="true">✓</span>}
          {message.text}
        </p>
      )}

      <ProfileForm profile={profile} email={email} />

      <PasswordResetSection />
    </>
  );
}
