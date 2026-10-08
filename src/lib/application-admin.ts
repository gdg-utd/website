import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ApplicationStaffRole = "admin" | "reviewer";

export async function requireApplicationStaff(returnPath = "/admin/applications") {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) redirect(`/login?next=${encodeURIComponent(returnPath)}`);

  const { data: staffMember } = await supabase
    .from("application_admins")
    .select("user_id, role")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (!staffMember) redirect("/dashboard?admin=denied");

  return {
    supabase,
    userId,
    role: staffMember.role as ApplicationStaffRole,
  };
}

export async function requireApplicationAdmin(returnPath = "/admin/applications") {
  const staff = await requireApplicationStaff(returnPath);
  if (staff.role !== "admin") redirect("/admin/applications?message=admin-required");
  return staff;
}
