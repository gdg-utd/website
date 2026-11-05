import type { Metadata } from "next";
import { requireApplicationAdmin } from "@/lib/application-admin";
import type { StaffAccessData } from "@/lib/staff-access";
import { StaffAccessPanel } from "./panel";

export const metadata: Metadata = { title: "Staff access" };
export const dynamic = "force-dynamic";
export default async function StaffAccessPage() {
  const { supabase, userId } = await requireApplicationAdmin("/admin/staff-access");
  const { data, error } = await supabase.rpc("get_staff_access");
  return <main className="admin-page"><div id="main-content" tabIndex={-1} className="admin-shell staff-access-page">
    <div className="admin-title-row"><div><p className="section-label">Application portal</p><h1>Staff access</h1><p>Manage who can review applications and administer the portal.</p></div></div>
    {error || !data ? <section className="email-panel"><h2>Staff access unavailable</h2><p>We couldn’t load staff access. Try refreshing. On first setup, apply the staff-access database migration.</p></section> : <StaffAccessPanel data={data as unknown as StaffAccessData} currentUserId={userId} />}
  </div></main>;
}
