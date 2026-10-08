import { createClient } from "@supabase/supabase-js";

type TemplateKey = "confirmation" | "acceptance" | "rejection";

type QueuePayload = {
  first_name?: unknown;
  opening_title?: unknown;
};

type TemplateDefinition = {
  brevo_template_id?: unknown;
  intro?: unknown;
  next_steps?: unknown;
};

const TEMPLATE_KEYS = new Set<TemplateKey>([
  "confirmation",
  "acceptance",
  "rejection",
]);

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function supabaseKey(jsonName: string, legacyName: string) {
  const encodedKeys = Deno.env.get(jsonName);
  if (encodedKeys) {
    try {
      const keys = JSON.parse(encodedKeys) as Record<string, unknown>;
      const preferred = typeof keys.default === "string" ? keys.default : undefined;
      const first = Object.values(keys).find((key): key is string => typeof key === "string");
      if (preferred || first) return preferred || first!;
    } catch {
      // Fall through to the legacy key while both key systems are supported.
    }
  }
  return requiredEnv(legacyName);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nextSteps(value: unknown) {
  if (!Array.isArray(value)) return stringValue(value);
  return value
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .map((item) => item.trim())
    .join(" ");
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return response({ error: "Method not allowed" }, 405);
  }

  const authorization = request.headers.get("authorization");
  if (!authorization) return response({ error: "Authentication required" }, 401);

  let applicationId: number;
  let templateKey: TemplateKey;

  try {
    const body = await request.json();
    applicationId = Number(body.applicationId);
    templateKey = body.templateKey;
  } catch {
    return response({ error: "Invalid request body" }, 400);
  }

  if (!Number.isSafeInteger(applicationId) || applicationId <= 0 || !TEMPLATE_KEYS.has(templateKey)) {
    return response({ error: "Invalid application or template" }, 400);
  }

  let supabaseUrl: string;
  let anonKey: string;
  let serviceRoleKey: string;
  let brevoApiKey: string;
  let senderEmail: string;

  try {
    supabaseUrl = requiredEnv("SUPABASE_URL");
    anonKey = supabaseKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    serviceRoleKey = supabaseKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    brevoApiKey = requiredEnv("BREVO_API_KEY");
    senderEmail = requiredEnv("BREVO_SENDER_EMAIL");
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
  if (authError || !authData.user) return response({ error: "Authentication required" }, 401);

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
  const isAllowed = templateKey === "confirmation" ? isApplicant || isAdmin : isAdmin;
  if (!isAllowed) return response({ error: "Not authorized" }, 403);

  const [{ data: queueItem }, { data: opening }] = await Promise.all([
    serviceClient
      .from("application_email_queue")
      .select("id, recipient, payload, status, idempotency_key")
      .eq("application_id", applicationId)
      .eq("template_key", templateKey)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    serviceClient
      .from("application_openings")
      .select("email_templates")
      .eq("id", application.opening_id)
      .maybeSingle(),
  ]);

  if (!queueItem || !opening) return response({ error: "Queued email not found" }, 404);
  if (queueItem.status === "sent") return response({ sent: true, alreadySent: true });

  const templates = objectValue(opening.email_templates);
  const template = objectValue(templates[templateKey]) as TemplateDefinition;
  const templateId = Number(template.brevo_template_id);
  if (!Number.isSafeInteger(templateId) || templateId <= 0) {
    return response({ error: "Brevo template is not configured" }, 503);
  }

  const payload = objectValue(queueItem.payload) as QueuePayload;
  const firstName = stringValue(payload.first_name, "there");
  const openingTitle = stringValue(payload.opening_title, "GDG UTDallas");
  const siteUrl = (Deno.env.get("SITE_URL") || "https://gdgutd.com").replace(/\/$/, "");
  const senderName = Deno.env.get("BREVO_SENDER_NAME")?.trim() || "GDG UTDallas";
  const replyTo = Deno.env.get("BREVO_REPLY_TO")?.trim();

  const emailRequest: Record<string, unknown> = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: queueItem.recipient, name: firstName }],
    templateId,
    params: {
      first_name: firstName,
      opening_title: openingTitle,
      preview_text: stringValue(template.intro, `An update about your ${openingTitle} application.`),
      next_steps: nextSteps(template.next_steps),
      dashboard_url: `${siteUrl}/dashboard`,
    },
    tags: ["applications", templateKey],
    headers: { "Idempotency-Key": queueItem.idempotency_key },
  };

  if (replyTo) emailRequest.replyTo = { email: replyTo, name: senderName };

  let brevoResponse: Response;
  try {
    brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(emailRequest),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    await serviceClient.from("application_email_queue").update({
      status: "failed",
      last_error: message.slice(0, 1000),
    }).eq("id", queueItem.id);
    return response({ error: "Brevo could not be reached" }, 502);
  }

  const brevoBody = await brevoResponse.json().catch(() => ({}));
  if (!brevoResponse.ok) {
    const errorMessage = JSON.stringify(brevoBody).slice(0, 1000);
    await serviceClient.from("application_email_queue").update({
      status: "failed",
      last_error: errorMessage,
    }).eq("id", queueItem.id);
    console.error("Brevo rejected an application email", brevoResponse.status, errorMessage);
    return response({ error: "Email delivery failed" }, 502);
  }

  const messageId = stringValue(objectValue(brevoBody).messageId);
  const { error: updateError } = await serviceClient
    .from("application_email_queue")
    .update({
      status: "sent",
      provider_message_id: messageId || null,
      last_error: null,
      sent_at: new Date().toISOString(),
    })
    .eq("id", queueItem.id);

  if (updateError) {
    console.error("Email sent but queue status could not be updated", updateError);
    return response({ error: "Email sent but delivery status was not recorded" }, 500);
  }

  return response({ sent: true, messageId: messageId || null });
});
