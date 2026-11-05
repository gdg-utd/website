export type EmailMetrics = Partial<Record<"requests" | "delivered" | "hardBounces" | "softBounces" | "blocked" | "invalid" | "spamReports" | "unsubscribed" | "uniqueOpens" | "uniqueClicks", number>>;
export type QueueEmail = { id: number; application_id: number; recipient: string; template_key: string; status: string; attempts: number; last_error: string | null; created_at: string; sent_at: string | null; next_attempt_at: string; provider_message_id: string | null };
export type EmailHealth = {
  updatedAt: string; days: number; warnings: string[]; dailyLimit: number | null;
  account: { name?: string; relayEnabled: boolean | null; plans: { type: string; credits: number; creditsType: string }[] } | null;
  totals: EmailMetrics | null; today: EmailMetrics | null;
  daily: (EmailMetrics & { date: string })[] | null;
  events: { date: string; email: string; event: string; reason?: string; messageId?: string; templateId?: number }[] | null;
  blocked: { count: number; contacts: { email: string; blockedAt: string; reason: { code?: string; message?: string } }[] } | null;
  senders: { email: string; name: string; active: boolean }[] | null;
  queue: { counts: Record<string, number | null>; recent: QueueEmail[] | null; issues: QueueEmail[] | null };
};

export function emailRate(numerator: number | undefined, denominator: number | undefined) {
  return numerator !== undefined && denominator !== undefined && denominator > 0
    ? `${((numerator / denominator) * 100).toFixed(1)}%` : "—";
}
export function bounceRate(metrics: EmailMetrics | null) {
  if (metrics?.hardBounces === undefined || metrics.softBounces === undefined) return "—";
  return emailRate(metrics.hardBounces + metrics.softBounces, metrics.requests);
}

export function dailyEmailQuota(data: Pick<EmailHealth, "account" | "dailyLimit">) {
  const configured = data.dailyLimit;
  const configuredLimit = typeof configured === "number" && Number.isSafeInteger(configured) && configured > 0 ? configured : null;
  const plans = data.account?.plans ?? [];
  // Free email credits reset daily. Paid/prepaid balances can cover another period.
  // https://developers.brevo.com/reference/get-account (credits = remaining credits)
  // https://help.brevo.com/hc/en-us/articles/208580669 (Free = 300 emails/day)
  const freePlan = plans.length === 1 && plans[0].type === "free" && plans[0].creditsType === "sendLimit" ? plans[0] : null;
  const limit = configuredLimit ?? (freePlan ? 300 : null);
  const remaining = freePlan && limit !== null && Number.isSafeInteger(freePlan.credits) && freePlan.credits >= 0 && freePlan.credits <= limit ? freePlan.credits : null;
  return { limit, remaining, used: limit !== null && remaining !== null ? limit - remaining : null };
}
