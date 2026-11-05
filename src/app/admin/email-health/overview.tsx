"use client";

import { useState } from "react";
import { EmailUsageMeter } from "./usage-meter";
import Link from "next/link";
import { bounceRate, emailRate, type EmailHealth, type QueueEmail } from "@/lib/email-health";

const number = (value: number | null | undefined) => value == null ? "—" : value.toLocaleString("en-US");
const date = (value: string | null | undefined) => value ? new Date(value).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" }) : "—";
const statusLabel = (status: string) => status === "sent" ? "Accepted by provider" : status === "uncertain" ? "Delivery unknown" : status.replaceAll("_", " ");

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <article className="email-metric"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</article>;
}

function QueueTable({ rows }: { rows: QueueEmail[] | null }) {
  if (!rows) return <p>Queue details are unavailable.</p>;
  if (!rows.length) return <p>No emails to show.</p>;
  return <div className="email-table-scroll"><table className="email-table"><thead><tr><th>Recipient / email</th><th>Status</th><th>Attempts</th><th>Created · Central</th><th>Details</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>
    <td><strong>{row.recipient}</strong><small>{row.template_key.replaceAll("_", " ")}</small><Link href={`/admin/applications?application=${row.application_id}`}>Review application #{row.application_id} ↗</Link></td>
    <td><span className={`email-badge email-badge-${row.status}`}>{statusLabel(row.status)}</span></td>
    <td>{row.attempts}{row.attempts >= 5 && row.status === "failed" && <small>Retry limit reached</small>}</td>
    <td>{date(row.created_at)}</td><td>{row.last_error && <p>{row.last_error}</p>}{row.status === "uncertain" ? <small>Check Brevo before retrying to avoid a duplicate.</small> : (row.status === "pending" || row.status === "failed") && row.attempts < 5 ? <small>Next eligible attempt: {date(row.next_attempt_at)}</small> : null}{row.sent_at && <small>Accepted: {date(row.sent_at)}</small>}{row.provider_message_id && <small className="email-message-id">ID: {row.provider_message_id}</small>}</td>
  </tr>)}</tbody></table></div>;
}

export function EmailHealthOverview({ data }: { data: EmailHealth }) {
  const [section, setSection] = useState("overview");
  const m = data.totals;
  const counts = data.queue.counts;
  const attention = (counts.failed ?? 0) + (counts.uncertain ?? 0);
  const unknownQueue = Object.values(counts).some(value => value === null);
  const max = Math.max(1, ...(data.daily ?? []).map(day => day.requests ?? 0));
  return <div className="email-overview">
    <div className="email-summary"><span className={`email-badge ${data.warnings.length || attention ? "email-badge-failed" : "email-badge-sent"}`}>{data.warnings.length || attention ? "Needs attention" : !data.account || !m || unknownQueue ? "Health unavailable" : "Reporting connected"}</span><p>Updated {date(data.updatedAt)} Central. Reports may be cached for up to one minute.</p></div>
    {data.warnings.length > 0 && <aside className="email-warning" aria-label="Reporting notices"><strong>Some data needs attention</strong><ul>{data.warnings.map(w => <li key={w}>{w}</li>)}</ul></aside>}
    <nav className="email-section-nav" aria-label="Email report sections">
      {[["overview", "Overview"], ["delivery", "Delivery"], ["queue", "Application queue"], ["activity", "Activity"], ["contacts", "Contacts & senders"]].map(([key, label]) => <button key={key} type="button" aria-pressed={section === key} onClick={() => setSection(key)}>{label}</button>)}
    </nav>
    {section === "overview" && <section className="email-panel"><div className="email-panel-heading"><h2>At a glance</h2><span>Last {data.days} days</span></div>
      <div className="email-metrics"><Metric label="Send requests" value={number(m?.requests)}/><Metric label="Delivery rate" value={emailRate(m?.delivered, m?.requests)}/><Metric label="Bounce rate" value={bounceRate(m)}/><Metric label="Queue needs attention" value={unknownQueue ? "—" : number(attention)}/></div>
      <div className="email-overview-actions"><button type="button" onClick={() => setSection("delivery")}>View delivery details →</button><button type="button" onClick={() => setSection("queue")}>Review application queue →</button></div>
    </section>}
    {section === "overview" && <>
    <section className="email-panel"><div className="email-panel-heading"><div><p className="section-label">Today & account</p><h2>Sending capacity</h2></div><span>{data.account?.name || "Brevo"}</span></div>
      <EmailUsageMeter data={data} />
      <div className="email-metrics email-metrics-three"><Metric label="Transactional requests today" value={number(data.today?.requests)} note="Today as reported by Brevo"/><Metric label="Delivered today" value={number(data.today?.delivered)} note="Reported delivered by Brevo"/><Metric label="Blocked today" value={number(data.today?.blocked)}/></div>
      <div className="email-account-details"><div><strong>Sending service</strong><span>{data.account?.relayEnabled === true ? "Enabled" : data.account?.relayEnabled === false ? "Disabled" : "Unavailable"}</span></div>{data.account?.plans.map((plan, i) => <div key={i}><strong>{plan.type} plan</strong><span>{number(plan.credits)} credits · {plan.creditsType}</span></div>)}</div>
      <small>Plan credits are reported directly by Brevo and may have a different allowance period from the daily limit.</small>
    </section>
    </>}
    {section === "delivery" && <>
    <section className="email-panel"><div className="email-panel-heading"><div><p className="section-label">Last {data.days} days · Brevo</p><h2>Delivery overview</h2></div></div>
      <div className="email-metrics"><Metric label="Send requests" value={number(m?.requests)}/><Metric label="Delivered" value={number(m?.delivered)}/><Metric label="Delivery rate" value={emailRate(m?.delivered, m?.requests)} note="Delivered ÷ requests"/><Metric label="Bounce rate" value={bounceRate(m)} note="Hard + soft bounces ÷ requests"/></div>
      <div className="email-metrics"><Metric label="Hard bounces" value={number(m?.hardBounces)} note="Permanent delivery failures"/><Metric label="Soft bounces" value={number(m?.softBounces)} note="Temporary delivery failures"/><Metric label="Blocked emails" value={number(m?.blocked)}/><Metric label="Invalid addresses" value={number(m?.invalid)}/></div>
      <div className="email-metrics"><Metric label="Spam complaints" value={number(m?.spamReports)}/><Metric label="Unsubscribes" value={number(m?.unsubscribed)}/><Metric label="Unique opens" value={number(m?.uniqueOpens)}/><Metric label="Unique clicks" value={number(m?.uniqueClicks)}/></div>
      <p>Rates use send requests as the denominator; no activity or unavailable data shows “—”. Provider events can arrive later, and opens may be affected by privacy protections.</p>
    </section>
    </>}
    {section === "queue" && <>
    <section className="email-panel"><div className="email-panel-heading"><div><p className="section-label">Website notifications · all time</p><h2>Application email queue</h2></div></div>
      <div className="email-metrics email-queue-metrics">{["pending", "processing", "sent", "failed", "uncertain", "cancelled"].map(status => <Metric key={status} label={statusLabel(status)} value={number(counts[status])}/>)}</div>
      <p>“Accepted by provider” confirms handoff to Brevo, not inbox delivery. Password resets and other account emails are included in Brevo activity, but are not recorded in this application queue.</p>
      <h3>Needs attention</h3><p>Latest 20 failed or uncertain notifications, regardless of reporting period. Open the application review to inspect or retry an email.</p><QueueTable rows={data.queue.issues}/>
      <details><summary>Recent application emails · latest 50 in the last {data.days} days</summary><QueueTable rows={data.queue.recent}/></details>
    </section>
    </>}
    {section === "activity" && <>
    <section className="email-panel"><div className="email-panel-heading"><div><p className="section-label">Daily history</p><h2>Sending activity</h2></div></div>
      {!data.daily ? <p>Daily history is unavailable.</p> : !data.daily.length ? <p>No sending activity in this period.</p> : <div className="email-table-scroll"><table className="email-table"><thead><tr><th>Day · Brevo</th><th>Requests</th><th>Delivered</th><th>Bounces</th><th>Blocked</th></tr></thead><tbody>{data.daily.map(day => <tr key={day.date}><td>{day.date}<span className="email-activity-bar" style={{ width: `${Math.max(1, ((day.requests ?? 0) / max) * 100)}%` }} aria-hidden="true"/></td><td>{number(day.requests)}</td><td>{number(day.delivered)}</td><td>{day.hardBounces !== undefined && day.softBounces !== undefined ? number(day.hardBounces + day.softBounces) : "—"}</td><td>{number(day.blocked)}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="email-panel"><h2>Recent provider activity</h2><p>Latest 50 events in the last {data.days} days. One email can have multiple events; this is not a count of distinct emails.</p>{!data.events ? <p>Provider activity is unavailable.</p> : !data.events.length ? <p>No events in this period.</p> : <div className="email-table-scroll"><table className="email-table"><thead><tr><th>Recipient</th><th>Event</th><th>Time · Central</th><th>Details</th></tr></thead><tbody>{data.events.map((event, i) => <tr key={`${event.messageId}-${i}`}><td>{event.email}</td><td>{event.event}</td><td>{date(event.date)}</td><td>{event.reason || "—"}{event.templateId != null && <small>Template #{event.templateId}</small>}{event.messageId && <small className="email-message-id">{event.messageId}</small>}</td></tr>)}</tbody></table></div>}</section>
    </>}
    {section === "contacts" && <>
    <div className="email-bottom-grid"><section className="email-panel"><h2>Blocked & unsubscribed contacts</h2><p>{number(data.blocked?.count)} total · latest 20 shown, across all time.</p>{!data.blocked ? <p>Blocklist unavailable.</p> : !data.blocked.contacts.length ? <p>No blocked contacts.</p> : <ul className="email-contact-list">{data.blocked.contacts.map((contact, i) => <li key={`${contact.email}-${i}`}><strong>{contact.email}</strong><span>{contact.reason?.message || contact.reason?.code || "Reason unavailable"}</span><small>{date(contact.blockedAt)}</small></li>)}</ul>}</section>
    <section className="email-panel"><h2>Sender status</h2>{!data.senders ? <p>Sender information unavailable.</p> : !data.senders.length ? <p>No senders configured.</p> : <ul className="email-contact-list">{data.senders.map(sender => <li key={sender.email}><strong>{sender.name}</strong><span>{sender.email}</span><span className={`email-badge ${sender.active ? "email-badge-sent" : "email-badge-failed"}`}>{sender.active ? "Active" : "Inactive"}</span></li>)}</ul>}<p>Domain authentication and full sender settings are available in Brevo.</p></section></div>
    </>}
  </div>;
}
