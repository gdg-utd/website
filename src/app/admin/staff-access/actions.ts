"use server";

import { revalidatePath } from "next/cache";
import { requireApplicationAdmin } from "@/lib/application-admin";
import type { StaffAccessResult } from "@/lib/staff-access";

export async function updateStaffAccess(email: string, role: string, expectedRole: string): Promise<StaffAccessResult> {
  const { supabase } = await requireApplicationAdmin("/admin/staff-access");
  if (typeof email !== "string" || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) || !["admin","reviewer","revoked"].includes(role) || !["new","admin","reviewer"].includes(expectedRole)) {
    return { status: "error", message: "Enter a valid account email and access level." };
  }
  const { error } = await supabase.rpc("set_staff_access", { target_email: email.trim().toLowerCase(), desired_role: role, expected_role: expectedRole });
  if (error) {
    const messages: Record<string, string> = {
      P0002: "No website account found. Ask this person to sign up first, then try again.",
      "40001": "This account’s access has changed. Refresh the page and try again.",
      "42501": "You no longer have permission to manage staff access.",
      "22023": "This change is not allowed. You cannot change your own access or remove the last administrator.",
    };
    return { status: "error", message: messages[error.code] ?? "Access could not be updated. Please try again." };
  }
  revalidatePath("/admin", "layout");
  return { status: "success", message: role === "revoked" ? "Staff access removed. Their member account is unchanged." : `${role === "admin" ? "Administrator" : "Reviewer"} access saved.` };
}
