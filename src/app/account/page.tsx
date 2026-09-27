import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
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
      <header className="auth-header">
        <Link href="/" aria-label="Return to the GDG UTD homepage">
          <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} priority />
        </Link>
        <Link href="/">Back home</Link>
      </header>
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
