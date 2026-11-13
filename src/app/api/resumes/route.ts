import { describeResume, RESUME_BUCKET } from "@/lib/resume-server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const resume = describeResume(new URL(request.url).searchParams.get("path"));
  if (!resume) return new Response("Resume not found.", { status: 404 });

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims?.sub) {
    return new Response("Sign in to view this resume.", { status: 401 });
  }

  const { data } = await supabase.storage.from(RESUME_BUCKET).createSignedUrl(resume.path, 60);
  if (!data?.signedUrl) return new Response("Resume not found.", { status: 404 });

  return new Response(null, {
    status: 307,
    headers: { Location: data.signedUrl, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
}
