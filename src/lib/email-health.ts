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
