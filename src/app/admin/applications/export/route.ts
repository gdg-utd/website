import { NextResponse } from "next/server";
import {
  answerLabel,
  parseApplicationOpening,
  type ApplicationResponses,
  type ApplicationField,
} from "@/lib/applications";
import { csvCell } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const { data: admin } = await supabase
    .from("application_admins")
    .select("role")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (admin?.role !== "admin")
    return new NextResponse("Forbidden", { status: 403 });

  // Discover historical question columns in bounded batches, without retaining applications.
  const exportStartedAt = new Date().toISOString();
  const fields = new Map<string, ApplicationField>();
  let lastId = 0;
  let maximumId = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("applications")
      .select("id,form_schema_snapshot")
      .eq("submission_state", "submitted")
      .lte("submitted_at", exportStartedAt)
      .gt("id", lastId)
      .order("id")
      .limit(200);
    if (error)
      return new NextResponse("Unable to prepare export", { status: 500 });
    if (!data?.length) break;
    for (const item of data) {
      const schema = item.form_schema_snapshot as unknown as {
        sections?: { fields: ApplicationField[] }[];
      };
      for (const section of schema.sections ?? [])
        for (const field of section.fields)
          fields.set(JSON.stringify([field.id, field.label]), field);
    }
    if (fields.size > 500)
      return new NextResponse(
        "This export contains too many question columns. Contact an administrator.",
        { status: 422 },
      );
    lastId = data[data.length - 1].id;
    maximumId = lastId;
    if (data.length < 200) break;
  }
  const ids = [...fields.keys()];
  const encoder = new TextEncoder();
  let afterId = 0;
  let headerSent = false;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!headerSent) {
        const headings = [
          "Application ID",
          "Position",
          "First name",
          "Last name",
          "Email",
          "Submitted at",
          "Decision",
          ...ids.map((id) => fields.get(id)!.label),
        ];
        controller.enqueue(
          encoder.encode(headings.map(csvCell).join(",") + "\r\n"),
        );
        headerSent = true;
        return;
      }
      const { data, error } = await supabase
        .from("applications")
        .select("*,application_openings(*)")
        .eq("submission_state", "submitted")
        .lte("submitted_at", exportStartedAt)
        .gt("id", afterId)
        .lte("id", maximumId)
        .order("id")
        .limit(200);
      if (error) {
        console.error("Application export batch failed", error.code);
        controller.error(new Error("Unable to finish application export"));
        return;
      }
      if (!data?.length) {
        controller.close();
        return;
      }
      const lines = data.map((item) => {
        if (!item.application_openings)
          throw new Error("Application opening missing during export");
        const opening = parseApplicationOpening({
          ...item.application_openings,
          form_schema: item.form_schema_snapshot,
        });
        const questions = new Map(
          opening.form_schema.sections
            .flatMap((section) => section.fields)
            .map((field) => [field.id, field]),
        );
        const responses = item.responses as ApplicationResponses;
        return [
          item.id,
          opening.title,
          item.applicant_first_name,
          item.applicant_last_name,
          item.applicant_email,
          item.submitted_at,
          item.published_decision,
          ...ids.map((id) =>
            questions.get(fields.get(id)!.id)?.label === fields.get(id)!.label
              ? answerLabel(
                  questions.get(fields.get(id)!.id)!,
                  responses[fields.get(id)!.id],
                )
              : "",
          ),
        ]
          .map(csvCell)
          .join(",");
      });
      controller.enqueue(encoder.encode(lines.join("\r\n") + "\r\n"));
      afterId = data[data.length - 1].id;
      if (data.length < 200) controller.close();
    },
  });
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gdg-utd-applications-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
