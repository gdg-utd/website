import { createClient } from "@supabase/supabase-js";
import {
  deliverQueuedEmail,
  requiredEnv,
  supabaseKey,
} from "../_shared/application-email.ts";

Deno.serve(async (request: Request) => {
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const token = request.headers.get("x-worker-token");
  if (!token || token.length !== 64)
    return new Response("Unauthorized", { status: 401 });
  const client = createClient(
    requiredEnv("SUPABASE_URL"),
    supabaseKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
  const { data: authorized, error: authError } = await client.rpc(
    "is_application_email_worker",
    { p_token: token },
  );
  if (authError || authorized !== true)
    return new Response("Unauthorized", { status: 401 });
  const { error: leaseError } = await client.rpc(
    "expire_application_email_leases",
  );
  if (leaseError)
    return new Response("Unable to recover delivery leases", { status: 500 });
  const { data: items, error } = await client
    .from("application_email_queue")
    .select("id")
    .in("status", ["pending", "failed"])
    .lt("attempts", 5)
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at")
    .order("id")
    .limit(5);
  if (error)
    return new Response("Unable to read delivery queue", { status: 500 });
  const results = [];
  for (const item of items ?? []) {
    try {
      results.push(await deliverQueuedEmail(client, item.id));
    } catch {
      results.push({ sent: false });
    }
  }
  return Response.json({
    processed: results.length,
    sent: results.filter((item) => item.sent).length,
  });
});
