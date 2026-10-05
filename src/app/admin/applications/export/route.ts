import { NextResponse } from "next/server";
import { answerLabel, parseApplicationOpening, type ApplicationResponses } from "@/lib/applications";
import { createClient } from "@/lib/supabase/server";

function csvCell(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value);
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { data: administrator } = await supabase
    .from("application_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!administrator) return new NextResponse("Forbidden", { status: 403 });

  const { data: applications, error } = await supabase
    .from("applications")
    .select("*, application_openings(*)")
    .eq("submission_state", "submitted")
    .order("submitted_at", { ascending: true });
  if (error) return new NextResponse("Unable to export applications", { status: 500 });

  const fieldLabels = new Map<string, string>();
  for (const application of applications ?? []) {
    if (!application.application_openings) continue;
    const opening = parseApplicationOpening(application.application_openings);
    for (const section of opening.form_schema.sections) {
      for (const field of section.fields) fieldLabels.set(field.id, field.label);
    }
  }

  const fieldIds = [...fieldLabels.keys()];
  const headers = ["Application ID", "Position", "First name", "Last name", "Email", "Submitted at", "Decision", ...fieldIds.map((id) => fieldLabels.get(id) ?? id)];
  const rows = (applications ?? []).map((application) => {
    if (!application.application_openings) return [];
    const opening = parseApplicationOpening(application.application_openings);
    const fields = new Map(opening.form_schema.sections.flatMap((section) => section.fields).map((field) => [field.id, field]));
    const responses = application.responses as ApplicationResponses;
    return [
      application.id,
      opening.title,
      application.applicant_first_name,
      application.applicant_last_name,
      application.applicant_email,
      application.submitted_at,
      application.published_decision,
      ...fieldIds.map((id) => {
        const field = fields.get(id);
        return field ? answerLabel(field, responses[id]) : "";
      }),
    ];
  }).filter((row) => row.length > 0);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gdg-utd-applications-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
