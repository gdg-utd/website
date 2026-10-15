import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { DashboardNavigation } from "./dashboard-navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (!userId) redirect("/login?next=/dashboard");

  const [{ data: profile }, { data: staff }] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name").eq("id", userId).maybeSingle(),
    supabase.from("application_admins").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle(),
  ]);

  const email = typeof claims?.email === "string" ? claims.email : "";
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "GDG member";
  const initials = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .map((name) => name?.charAt(0).toUpperCase())
    .join("") || email.charAt(0).toUpperCase() || "G";

  return (
    <main className="dashboard-page">
      <header className="dashboard-portal-header">
        <Link href="/" aria-label="Return to the GDG UTD homepage">
          <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} loading="eager" />
        </Link>
        <div>
          {staff && <Link className="dashboard-admin-link" href="/admin/applications">Application portal</Link>}
          <Link className="dashboard-home-link" href="/">Back to website</Link>
          <form action={logout}>
            <button className="account-logout" type="submit">Log out</button>
          </form>
        </div>
      </header>

      <div className="dashboard-portal-shell">
        <aside className="dashboard-sidebar">
          <div className="dashboard-identity">
            <span aria-hidden="true">{initials}</span>
            <div>
              <strong>{fullName}</strong>
              <small>{email}</small>
            </div>
          </div>
          <DashboardNavigation />
        </aside>
        <div className="dashboard-content">{children}</div>
      </div>
    </main>
  );
}
