import type { SupabaseClient } from "@supabase/supabase-js";

type TemplateDefinition = {
  brevo_template_id?: unknown;
  intro?: unknown;
  next_steps?: unknown;
};
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
      const preferred =
        typeof keys.default === "string" ? keys.default : undefined;
      const first = Object.values(keys).find(
        (key): key is string => typeof key === "string",
      );
      if (preferred || first) return preferred || first!;
    } catch {
      // Fall through to the legacy key while both key systems are supported.
    }
  }
  return requiredEnv(legacyName);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nextSteps(value: unknown) {
  if (!Array.isArray(value)) return stringValue(value);
  return value
    .filter(
      (item): item is string =>
        typeof item === "string" && Boolean(item.trim()),
    )
    .map((item) => item.trim())
    .join(" ");
}

function centralDeadline(value: unknown) {
  const parsed = typeof value === "string" ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime()))
    return "72 hours after this email was sent";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
    timeZoneName: "short",
  }).format(parsed);
}

export async function deliverQueuedEmail(
  serviceClient: SupabaseClient,
  queueId: number,
) {
  const { data: claimed, error: claimError } = await serviceClient.rpc(
    "claim_application_email",
    { queue_id: queueId },
  );
  if (claimError) throw new Error("Unable to reserve queued email");
  const item = claimed?.[0];
  if (!item) return { sent: false, skipped: true };
  async function record(values: Record<string, unknown>) {
    const { data, error } = await serviceClient
      .from("application_email_queue")
      .update({ ...values, lease_token: null, locked_until: null })
      .eq("id", item.id)
      .eq("lease_token", item.lease_token)
      .eq("status", "processing")
      .select("id")
      .maybeSingle();
    if (error || !data)
      throw new Error("Unable to record email delivery status");
  }
  const retryAt = new Date(
    Date.now() + Math.min(60, 2 ** (item.attempts - 1)) * 60000,
  ).toISOString();
  let providerAccepted = false;
  try {
    const { data: opening, error: openingError } = await serviceClient
      .from("application_openings")
      .select("email_templates")
      .eq("id", item.opening_id)
      .single();
    if (openingError) throw new Error("Unable to read email template");
    const template = objectValue(
      objectValue(opening?.email_templates)[item.template_key],
    ) as TemplateDefinition;
    const templateId = Number(template.brevo_template_id);
    if (!Number.isSafeInteger(templateId) || templateId <= 0)
      throw new Error("Email template is not configured");
    const payload = objectValue(item.payload);
    const firstName = stringValue(payload.first_name, "there");
    const openingTitle = stringValue(payload.opening_title, "GDG UTDallas");
    const siteUrl = (Deno.env.get("SITE_URL") || "https://gdgutd.com").replace(
      /\/$/,
      "",
    );
    const senderName =
      Deno.env.get("BREVO_SENDER_NAME")?.trim() || "GDG UTDallas";
    const replyTo = Deno.env.get("BREVO_REPLY_TO")?.trim();
    const request: Record<string, unknown> = {
      sender: { email: requiredEnv("BREVO_SENDER_EMAIL"), name: senderName },
      to: [{ email: item.recipient, name: firstName }],
      templateId,
      params: {
        first_name: firstName,
        opening_title: openingTitle,
        preview_text: stringValue(
          template.intro,
          `An update about your ${openingTitle} application.`,
        ),
        next_steps: nextSteps(template.next_steps),
        dashboard_url: `${siteUrl}/dashboard/applications`,
        rsvp_url: `${siteUrl}/dashboard/applications`,
        rsvp_deadline: centralDeadline(payload.rsvp_deadline),
      },
      tags: ["applications", item.template_key],
      headers: { idempotencyKey: item.provider_idempotency_key },
    };
    if (replyTo) request.replyTo = { email: replyTo, name: senderName };
    let result: Response;
    try {
      result = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": requiredEnv("BREVO_API_KEY"),
          "content-type": "application/json",
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      await record({
        status: "uncertain",
        last_error: "No delivery acknowledgement. Check Brevo before retrying.",
      });
      return { sent: false, uncertain: true };
    }
    const body = objectValue(await result.json().catch(() => ({})));
    const duplicate = body.code === "duplicate_parameter";
    if (!result.ok && !duplicate) {
      await record({
        status: "failed",
        last_error: `Provider returned ${result.status} (${stringValue(body.code, "delivery_error")}).`,
        next_attempt_at: retryAt,
      });
      return { sent: false, retryScheduled: item.attempts < 5 };
    }
    providerAccepted = true;
    await record({
      status: "sent",
      last_error: null,
      provider_message_id: stringValue(body.messageId) || null,
      sent_at: new Date().toISOString(),
    });
    return { sent: true, alreadySent: duplicate };
  } catch (error) {
    console.error(
      "Queued application email processing failed",
      item.id,
      error instanceof Error ? error.message : "Unknown error",
    );
    // Once provider acknowledgement exists, a DB failure must never trigger a blind resend.
    try {
      await record({
        status: providerAccepted ? "uncertain" : "failed",
        last_error: providerAccepted
          ? "Provider accepted the email; delivery recording failed. Check Brevo before retrying."
          : "Unable to prepare email delivery.",
        next_attempt_at: retryAt,
      });
    } catch {
      /* Lease expiry marks this for administrator review. */
    }
    return {
      sent: false,
      retryScheduled: !providerAccepted && item.attempts < 5,
      uncertain: providerAccepted,
    };
  }
}

export { requiredEnv, supabaseKey };
