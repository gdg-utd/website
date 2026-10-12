import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UtdProgramFields } from "@/components/utd-program-fields";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "./actions";

export const metadata: Metadata = { title: "Your profile" };

type ProfilePageProps = {
  searchParams: Promise<{ message?: string }>;
};

const messages: Record<string, { text: string; error?: boolean }> = {
  saved: { text: "Your profile was updated." },
  "invalid-name": { text: "Enter a valid first and last name.", error: true },
  "invalid-netid": { text: "Enter a valid NetID using letters and numbers only.", error: true },
  "invalid-program": { text: "Select a valid UT Dallas degree and major.", error: true },
  failed: { text: "We could not update your profile. Please try again.", error: true },
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = claims?.sub;

  if (!userId) redirect("/login?next=/dashboard/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, net_id, degree, major")
    .eq("id", userId)
    .maybeSingle();

  const email = typeof claims?.email === "string" ? claims.email : "";
  const message = query.message ? messages[query.message] : undefined;

  return (
    <>
      <header className="dashboard-page-heading">
        <div>
          <p className="section-label">Your details</p>
          <h1>Profile</h1>
          <p>Keep your information up to date. Optional fields can be completed now or later.</p>
        </div>
      </header>

      {message && (
        <p className={`dashboard-notice${message.error ? " dashboard-notice-error" : ""}`} role="status">
          {!message.error && <span aria-hidden="true">✓</span>}{message.text}
        </p>
      )}

      <form className="dashboard-profile-form" action={updateProfile}>
        <div className="dashboard-profile-section-heading">
          <div>
            <h2>Personal information</h2>
            <p>Your email is connected to your account and cannot be edited here.</p>
          </div>
          <span><i aria-hidden="true">*</i> Required</span>
        </div>
        <div className="dashboard-profile-grid">
          <label>
            <span>First name <i aria-hidden="true">*</i></span>
            <input name="firstName" defaultValue={profile?.first_name ?? ""} maxLength={50} autoComplete="given-name" required />
          </label>
          <label>
            <span>Last name <i aria-hidden="true">*</i></span>
            <input name="lastName" defaultValue={profile?.last_name ?? ""} maxLength={50} autoComplete="family-name" required />
          </label>
          <label className="dashboard-profile-full-field">
            <span>Email</span>
            <input value={email} type="email" autoComplete="email" readOnly aria-readonly="true" />
            <small>Managed through your sign-in account.</small>
          </label>
          <label>
            <span>NetID</span>
            <input name="netId" defaultValue={profile?.net_id ?? ""} maxLength={30} autoCapitalize="none" autoCorrect="off" placeholder="abc123456" />
          </label>
          <UtdProgramFields
            degreeName="degree"
            majorName="major"
            idPrefix="profile-program"
            defaultDegree={profile?.degree}
            defaultMajor={profile?.major}
            majorClassName="dashboard-profile-full-field"
          />
        </div>
        <div className="dashboard-profile-actions">
          <p>You can return and update these details at any time.</p>
          <button type="submit">Save changes <span aria-hidden="true">→</span></button>
        </div>
      </form>
    </>
  );
}
