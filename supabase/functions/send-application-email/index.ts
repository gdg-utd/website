import { createClient } from "@supabase/supabase-js";
import {
  deliverQueuedEmail,
  requiredEnv,
  supabaseKey,
} from "../_shared/application-email.ts";

type TemplateKey =
  | "confirmation"
  | "acceptance"
  | "rejection"
  | "officer_update"
  | "rsvp_expired";

const TEMPLATE_KEYS = new Set<TemplateKey>([
  "confirmation",
  "acceptance",
  "rejection",
  "officer_update",
  "rsvp_expired",
]);

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return response({ error: "Method not allowed" }, 405);
  }

  const authorization = request.headers.get("authorization");
  if (!authorization)
    return response({ error: "Authentication required" }, 401);

  let applicationId: number;
  let templateKey: TemplateKey;
  let queueId: number | undefined;

  try {
    const body = await request.json();
    applicationId = Number(body.applicationId);
    templateKey = body.templateKey;
    queueId = body.queueId === undefined ? undefined : Number(body.queueId);
  } catch {
    return response({ error: "Invalid request body" }, 400);
  }

  if (
    !Number.isSafeInteger(applicationId) ||
    applicationId <= 0 ||
    !TEMPLATE_KEYS.has(templateKey) ||
    (queueId !== undefined && (!Number.isSafeInteger(queueId) || queueId <= 0))
  ) {
    return response({ error: "Invalid application or template" }, 400);
  }

  let supabaseUrl: string;
  let anonKey: string;
  let serviceRoleKey: string;

  try {
    supabaseUrl = requiredEnv("SUPABASE_URL");
    anonKey = supabaseKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    serviceRoleKey = supabaseKey(
      "SUPABASE_SECRET_KEYS",
      "SUPABASE_SERVICE_ROLE_KEY",
    );
  } catch (error) {
    console.error(error);
    return response({ error: "Email delivery is not configured" }, 503);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user)
    return response({ error: "Authentication required" }, 401);

  const [{ data: application }, { data: admin }] = await Promise.all([
    serviceClient
      .from("applications")
      .select("id, applicant_id, opening_id")
      .eq("id", applicationId)
      .maybeSingle(),
    serviceClient
      .from("application_admins")
      .select("user_id, role")
      .eq("user_id", authData.user.id)
      .eq("active", true)
      .maybeSingle(),
  ]);

  if (!application) return response({ error: "Application not found" }, 404);

  const isAdmin = admin?.role === "admin";
  const isApplicant = application.applicant_id === authData.user.id;
  const isAllowed =
    templateKey === "confirmation" ? isApplicant || isAdmin : isAdmin;
  if (!isAllowed) return response({ error: "Not authorized" }, 403);

  let query = serviceClient
    .from("application_email_queue")
    .select("id,status")
    .eq("application_id", applicationId)
    .eq("template_key", templateKey);
  if (queueId !== undefined) query = query.eq("id", queueId);
  const { data: item, error: queueError } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (queueError)
    return response({ error: "Unable to read delivery queue" }, 500);
  if (!item) return response({ error: "Queued email not found" }, 404);
  if (item.status === "sent")
    return response({ sent: true, alreadySent: true });
  try {
    const result = await deliverQueuedEmail(serviceClient, item.id);
    return response(result, result.sent || result.skipped ? 200 : 502);
  } catch {
    return response({ error: "Unable to process queued email" }, 500);
  }
});
