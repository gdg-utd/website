import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  const email = typeof claims?.email === "string" ? claims.email : "";
  const firstName = profile?.first_name || email.split("@")[0] || "Member";
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  return (
    <main className="account-page">
      <SiteHeader isSignedIn />
      <section className="account-content">
        <div className="account-mark" aria-hidden="true">
          {firstName.charAt(0).toUpperCase()}
        </div>
        <p className="section-label">Member account</p>
        <h1>Hi, {fullName || firstName}.</h1>
        <p className="account-email">{email}</p>
        <p className="account-note">Your account is connected. Member features will appear here as they are added.</p>
        <form action={logout}>
          <button className="account-logout" type="submit">Log out</button>
        </form>
      </section>
    </main>
  );
}
