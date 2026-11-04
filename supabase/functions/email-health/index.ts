import { createClient } from "@supabase/supabase-js";
import { requiredEnv, supabaseKey } from "../_shared/application-email.ts";

const statuses = ["pending", "processing", "sent", "failed", "uncertain", "cancelled"];
const snapshots = new Map<number, { expires: number; body: unknown }>();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "private, no-store" },
});

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("authorization");
  if (!authorization) return json({ error: "Authentication required" }, 401);
  try {
    const url = requiredEnv("SUPABASE_URL");
    const user = createClient(url, supabaseKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data: auth, error: authError } = await user.auth.getUser();
    if (authError || !auth.user) return json({ error: "Authentication required" }, 401);
    const service = createClient(url, supabaseKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
    const { data: staff, error: staffError } = await service.from("application_admins")
      .select("role").eq("user_id", auth.user.id).eq("active", true).maybeSingle();
    if (staffError || staff?.role !== "admin") return json({ error: "Administrator access required" }, 403);
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid request" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid request" }, 400);
    const days = body.days === undefined ? 7 : body.days;
    if (![7, 30].includes(days)) return json({ error: "Choose 7 or 30 days" }, 400);
    const cached = snapshots.get(days);
    if (cached && cached.expires > Date.now()) return json(cached.body);
    const now = new Date();
    const warnings: string[] = [];
    const since = new Date(now.getTime() - days * 86400000).toISOString();
    const key = Deno.env.get("BREVO_API_KEY");
    async function brevo(path: string, label: string) {
      if (!key) return null;
      try {
        const response = await fetch(`https://api.brevo.com/v3/${path}`, {
          headers: { "api-key": key, accept: "application/json" }, signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) {
          warnings.push(`${label} unavailable (${response.status === 429 ? "Brevo rate limit reached" : `provider status ${response.status}`}).`);
          return null;
        }
        return await response.json();
      } catch { warnings.push(`${label} could not be reached. Try refreshing shortly.`); return null; }
    }
    if (!key) warnings.push("Brevo reporting is not configured. Application queue data is still available.");
    const [account, totals, today, daily, events, blocked, senders, counts, recent, issues] = await Promise.all([
      brevo("account", "Account details"),
      brevo(`smtp/statistics/aggregatedReport?days=${days}`, "Delivery metrics"),
      brevo("smtp/statistics/aggregatedReport?days=1", "Today's usage"),
      brevo(`smtp/statistics/reports?days=${days}&limit=30&sort=desc`, "Daily history"),
      brevo(`smtp/statistics/events?days=${days}&limit=50&sort=desc`, "Recent email activity"),
      brevo("smtp/blockedContacts?limit=20&sort=desc", "Blocked contacts"),
      brevo("senders", "Sender verification"),
      Promise.all(statuses.map(async status => {
        const r = await service.from("application_email_queue").select("id", { count: "exact", head: true }).eq("status", status);
        return { status, count: r.error ? null : r.count, failed: !!r.error };
      })),
      service.from("application_email_queue").select("id,application_id,recipient,template_key,status,attempts,last_error,created_at,sent_at,next_attempt_at,provider_message_id")
        .gte("created_at", since).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(50),
      service.from("application_email_queue").select("id,application_id,recipient,template_key,status,attempts,last_error,created_at,sent_at,next_attempt_at,provider_message_id")
        .in("status", ["failed", "uncertain"]).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(20),
    ]);
    if (counts.some(c => c.failed) || recent.error || issues.error) warnings.push("Some application queue data is unavailable. Counts shown as unavailable are not zero.");
    const limit = Number(Deno.env.get("BREVO_DAILY_EMAIL_LIMIT"));
    // Only return fields needed by the dashboard; account responses can contain private tracker keys.
    const snapshot = {
      updatedAt: now.toISOString(), days, warnings,
      account: account ? { name: account.companyName, relayEnabled: account.relay?.enabled ?? null,
        plans: (account.plan ?? []).filter((p: { type: string }) => p.type !== "sms").map((p: { type: string; credits: number; creditsType: string }) => ({ type: p.type, credits: p.credits, creditsType: p.creditsType })) } : null,
      dailyLimit: Number.isSafeInteger(limit) && limit > 0 ? limit : null,
      totals, today, daily: daily?.reports ?? null,
      events: events ? (events.events ?? []).map((e: Record<string, unknown>) => ({ date: e.date, email: e.email, event: e.event, reason: e.reason, messageId: e.messageId, templateId: e.templateId })) : null,
      blocked: blocked ? { count: blocked.count, contacts: (blocked.contacts ?? []).map((c: Record<string, unknown>) => ({ email: c.email, blockedAt: c.blockedAt, reason: c.reason })) } : null,
      senders: senders ? (senders.senders ?? []).map((s: Record<string, unknown>) => ({ email: s.email, name: s.name, active: s.active })) : null,
      queue: { counts: Object.fromEntries(counts.map(c => [c.status, c.count])), recent: recent.error ? null : recent.data, issues: issues.error ? null : issues.data },
    };
    snapshots.set(days, { expires: Date.now() + 60_000, body: snapshot });
    return json(snapshot);
  } catch {
    return json({ error: "Email health could not be loaded. Try again shortly." }, 503);
  }
});
