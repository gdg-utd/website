import { dailyEmailQuota, type EmailHealth } from "@/lib/email-health";

export function EmailUsageMeter({ data }: { data: EmailHealth }) {
  const { limit, used, remaining } = dailyEmailQuota(data);
  const known = limit !== null && used !== null && remaining !== null;
  const tone = known && used >= limit ? "full" : known && used / limit >= .8 ? "near" : "normal";
  const format = (value: number | null) => value === null ? "—" : value.toLocaleString("en-US");
  return <div className={`email-usage-meter email-usage-${tone}`}>
    <div className="email-usage-heading"><div><span>Daily email allowance</span><p><strong>{format(used)}</strong><span> / {format(limit)}</span></p><small>emails used today</small></div>
      <div className="email-usage-remaining"><strong>{format(remaining)}</strong><span>{known ? "emails left today" : "remaining unavailable"}</span></div>
    </div>
    {known ? <><progress max={limit} value={used} aria-label="Daily email allowance used" aria-valuetext={`${used} of ${limit} emails used; ${remaining} remaining`}/><div className="email-usage-caption"><span>{Math.round(used / limit * 100)}% used</span><span>{remaining === 0 ? "Daily allowance reached" : "Resets daily"}</span></div><p className="email-usage-note">Based on Brevo’s remaining account credits. Includes all emails that use this daily allowance.</p></> : <p className="email-usage-note">{limit === null ? "Daily allowance is unavailable for this plan." : "The daily limit is configured, but Brevo has not supplied a matching daily balance."} Your transactional activity is shown below.</p>}
  </div>;
}
