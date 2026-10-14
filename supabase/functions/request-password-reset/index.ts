import { createClient } from "@supabase/supabase-js";

const GENERIC_MESSAGE =
  "If an account exists for that email, a password reset link is on its way.";

function response(status = 200) {
  return new Response(JSON.stringify({ accepted: true, message: GENERIC_MESSAGE }), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
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
      // Fall through while both Supabase key formats remain supported.
    }
  }
  return requiredEnv(legacyName);
}

function isUtdEmail(value: string) {
  return value.length <= 320 && /^[^@\s]+@utdallas\.edu$/i.test(value);
}

async function hashKey(secret: string, namespace: string, value: string) {
  const bytes = new TextEncoder().encode(`${secret}:${namespace}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  let email = "";
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return response();
  }

  if (!isUtdEmail(email)) return response();

  let supabaseUrl: string;
  let serviceRoleKey: string;
  let brevoApiKey: string;
  let senderEmail: string;

  try {
    supabaseUrl = requiredEnv("SUPABASE_URL");
    serviceRoleKey = supabaseKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    brevoApiKey = requiredEnv("BREVO_API_KEY");
    senderEmail = requiredEnv("BREVO_SENDER_EMAIL");
  } catch (error) {
    console.error(error);
    return response(503);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const rateLimitSecret = Deno.env.get("PASSWORD_RESET_RATE_LIMIT_SECRET")?.trim()
    || serviceRoleKey;
  const [emailKey, globalKey] = await Promise.all([
    hashKey(rateLimitSecret, "password-reset-email", email),
    hashKey(rateLimitSecret, "password-reset-global", "all"),
  ]);
  const [{ data: emailAllowed, error: emailLimitError }, { data: globalAllowed, error: globalLimitError }] =
    await Promise.all([
      serviceClient.rpc("consume_password_reset_rate_limit", {
        p_key_hash: emailKey,
        p_max_requests: 3,
        p_window_seconds: 3600,
      }),
      serviceClient.rpc("consume_password_reset_rate_limit", {
        p_key_hash: globalKey,
        p_max_requests: 500,
        p_window_seconds: 3600,
      }),
    ]);

  if (emailLimitError || globalLimitError) {
    console.error("Password reset rate limit failed", emailLimitError, globalLimitError);
    return response(503);
  }
  if (!emailAllowed || !globalAllowed) return response();

  const siteUrl = (Deno.env.get("SITE_URL") || "https://gdgutd.com").replace(/\/$/, "");
  const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${siteUrl}/dashboard/profile?recovery=1` },
  });

  if (linkError || !linkData.properties?.hashed_token || !linkData.user) {
    // Keep the public response identical so callers cannot enumerate accounts.
    if (linkError && !linkError.message.toLowerCase().includes("not found")) {
      console.error("Unable to generate password recovery link", linkError.message);
    }
    return response();
  }

  const { data: template, error: templateError } = await serviceClient
    .from("system_email_templates")
    .select("brevo_template_id")
    .eq("template_key", "password_reset")
    .eq("active", true)
    .maybeSingle();

  if (templateError || !template?.brevo_template_id) {
    console.error("Password reset email template is not configured", templateError);
    return response(503);
  }

  const resetUrl = new URL("/auth/callback", siteUrl);
  resetUrl.searchParams.set("token_hash", linkData.properties.hashed_token);
  resetUrl.searchParams.set("type", "recovery");
  resetUrl.searchParams.set("next", "/dashboard/profile?recovery=1");

  const firstName = typeof linkData.user.user_metadata?.first_name === "string"
    ? linkData.user.user_metadata.first_name.trim()
    : "there";
  const senderName = Deno.env.get("BREVO_SENDER_NAME")?.trim() || "GDG UTDallas";
  const replyTo = Deno.env.get("BREVO_REPLY_TO")?.trim();
  const emailRequest: Record<string, unknown> = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email, name: firstName }],
    templateId: template.brevo_template_id,
    params: {
      first_name: firstName,
      preview_text: "Use this secure link to reset your GDG UTDallas password.",
      reset_url: resetUrl.toString(),
    },
    tags: ["account", "password-reset"],
    headers: { "Idempotency-Key": `password-reset-${emailKey}-${Date.now()}` },
  };
  if (replyTo) emailRequest.replyTo = { email: replyTo, name: senderName };

  try {
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(emailRequest),
    });

    if (!brevoResponse.ok) {
      const body = await brevoResponse.text();
      console.error("Brevo rejected a password reset email", brevoResponse.status, body.slice(0, 1000));
    }
  } catch (error) {
    console.error("Brevo could not be reached for a password reset email", error);
  }

  return response();
});
