import type { Tables } from "@/lib/supabase/database.types";

export type StaffApplicationPage = {
  applications: (Pick<
    Tables<"applications">,
    | "id"
    | "applicant_first_name"
    | "applicant_last_name"
    | "applicant_email"
    | "opening_id"
    | "submitted_at"
    | "published_decision"
  > & {
    application_openings: { slug: string; title: string; accent: string };
    application_rsvps: { status: string; deadline_at: string } | null;
    staged_decision: "accepted" | "rejected" | null;
  })[];
  matched: number;
  page: number;
  pageSize: number;
  stagedCount: number;
  metrics: {
    total: number;
    accepted: number;
    notSelected: number;
    awaiting: number;
  };
  rsvpSummary: {
    confirmed: number;
    released: number;
    expired: number;
    awaiting: number;
    readyToRelease: number;
  };
};

export function applicationPageNumber(value: string | undefined) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0
    ? Math.min(number, 100000)
    : 1;
}
