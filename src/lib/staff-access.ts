export type StaffMember = { user_id: string; email: string; name: string; role: "admin" | "reviewer"; active: boolean; created_at: string };
export type StaffAccessData = {
  members: StaffMember[];
  events: { id: number; target_email: string; previous_role: string | null; new_role: string | null; created_at: string; actor_email: string }[];
};
export type StaffAccessResult = { status: "success" | "error"; message: string };
