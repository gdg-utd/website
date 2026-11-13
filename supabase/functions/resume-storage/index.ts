import { createClient } from "@supabase/supabase-js";
import { requiredEnv, supabaseKey } from "../_shared/application-email.ts";

const BUCKET = "member-resumes";
const MAX_BYTES = 4 * 1024 * 1024;

async function readPdf(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const cleanupToken = request.headers.get("x-resume-cleanup-token");
  const authorization = request.headers.get("authorization");
  if (cleanupToken === null && !authorization) return new Response(null, { status: 401 });

  try {
    const url = requiredEnv("SUPABASE_URL");
    const service = createClient(url, supabaseKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
    const bucket = service.storage.from(BUCKET);

    if (cleanupToken !== null) {
      if (!/^[a-f0-9]{64}$/.test(cleanupToken)) return new Response(null, { status: 401 });
      const { data: authorized, error: authError } = await service.rpc("is_resume_cleanup_worker", { p_token: cleanupToken });
      if (authError || authorized !== true) return new Response(null, { status: 401 });
      const { data: paths, error: claimError } = await service.rpc("claim_unused_resume_files");
      if (claimError) throw claimError;
      if (!paths.length) return Response.json({ removed: 0 });
      const { data, error } = await bucket.remove(paths);
      if (error) throw error;
      return Response.json({ removed: data.length });
    }

    const member = createClient(url, supabaseKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authorization! } },
      auth: { persistSession: false },
    });
    const { data: auth, error: authError } = await member.auth.getUser();
    const user = auth?.user;
    if (authError || !user || !user.email_confirmed_at || !/^[^@\s]+@utdallas\.edu$/i.test(user.email ?? "")) {
      return new Response(null, { status: 401 });
    }

    const filename = request.headers.get("x-resume-filename") ?? "";
    if (!/^[A-Za-z0-9_-]{1,240}$/.test(filename) || request.headers.get("content-type") !== "application/pdf" || !request.body) {
      return new Response(null, { status: 400 });
    }
    if (Number(request.headers.get("content-length")) > MAX_BYTES) return new Response(null, { status: 413 });
    const pdf = await readPdf(request.body);
    if (!pdf) return new Response(null, { status: 413 });
    if (new TextDecoder().decode(pdf.subarray(0, 5)) !== "%PDF-") return new Response(null, { status: 400 });

    const { data: reserved, error: quotaError } = await service.rpc("reserve_resume_upload", {
      p_member_id: user.id,
      p_bytes: pdf.byteLength,
    });
    if (quotaError) throw quotaError;
    if (reserved !== true) return new Response(null, { status: 429 });

    const path = `${user.id}/${crypto.randomUUID()}/${filename}.pdf`;
    const { error } = await bucket.upload(path, pdf, {
      contentType: "application/pdf",
      cacheControl: "0",
      upsert: false,
    });
    if (error) throw error;
    return Response.json({ path });
  } catch {
    console.error("Resume storage operation failed");
    return new Response(null, { status: 503 });
  }
});
