"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StaffAccessData } from "@/lib/staff-access";
import { updateStaffAccess } from "./actions";

type Change = { email: string; role: string; expected: string };
const roleName = (role: string) => role === "admin" ? "Administrator" : "Reviewer";

export function StaffAccessPanel({ data, currentUserId }: { data: StaffAccessData; currentUserId: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("reviewer");
  const [query, setQuery] = useState("");
  const [showRemoved, setShowRemoved] = useState(false);
  const [change, setChange] = useState<Change | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const active = data.members.filter(member => member.active);
  const visible = data.members.filter(member => member.active === !showRemoved && `${member.name} ${member.email}`.toLowerCase().includes(query.toLowerCase()));

  function review(next: Change) { setChange(next); setError(""); dialog.current?.showModal(); }
  function save() {
    if (!change || pending) return;
    startTransition(async () => {
      try {
        const result = await updateStaffAccess(change.email, change.role, change.expected);
        if (result.status === "error") { setError(result.message); return; }
        setMessage(result.message); setEmail(""); dialog.current?.close(); setChange(null); router.refresh();
      } catch { setError("Unable to save access. Please try again."); }
    });
  }

  return <div className="staff-access-content">
    <div className="email-metrics staff-access-metrics"><article className="email-metric"><span>Administrators</span><strong>{active.filter(m => m.role === "admin").length}</strong></article><article className="email-metric"><span>Reviewers</span><strong>{active.filter(m => m.role === "reviewer").length}</strong></article></div>
    {message && <p className="admin-notice" role="status">{message}</p>}
    <section className="email-panel"><h2>Add staff</h2><p>Use the email address of an existing website account. No invitation email is sent.</p>
      <form className="staff-add-form" onSubmit={event => { event.preventDefault(); review({ email: email.trim().toLowerCase(), role, expected: "new" }); }}>
        <label>Account email<input type="email" autoComplete="off" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="name@utdallas.edu" /></label>
        <label>Access level<select value={role} onChange={event => setRole(event.target.value)}><option value="reviewer">Reviewer</option><option value="admin">Administrator</option></select></label>
        <button type="submit" className="admin-publish-all" disabled={pending}>Review access</button>
      </form>
      <div className="staff-permissions"><p><strong>Reviewer</strong> Review submitted applications and stage decisions.</p><p><strong>Administrator</strong> Publish decisions, manage emails, and manage staff access.</p></div>
    </section>
    <section className="email-panel"><div className="email-panel-heading"><h2>{showRemoved ? "Removed staff" : "Current staff"}</h2><button type="button" className="staff-text-button" onClick={() => setShowRemoved(value => !value)}>{showRemoved ? "Show current staff" : "Show removed staff"}</button></div>
      <label className="staff-search">Search staff<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name or email" /></label>
      <ul className="staff-members">{visible.map(member => <li key={member.user_id}>
        <div className="staff-member-identity"><strong>{member.name || member.email}{member.user_id === currentUserId && <span className="email-badge">You</span>}</strong><span>{member.email}</span><small>{member.active ? roleName(member.role) : "Access removed"}</small></div>
        <div className="staff-member-actions">{member.user_id === currentUserId ? <small>Another administrator can change your access.</small> : member.active ? <><button type="button" disabled={pending} onClick={() => review({ email: member.email, role: member.role === "admin" ? "reviewer" : "admin", expected: member.role })}>Make {member.role === "admin" ? "reviewer" : "administrator"}</button><button type="button" className="staff-remove" disabled={pending} onClick={() => review({ email: member.email, role: "revoked", expected: member.role })}>Remove access</button></> : <button type="button" disabled={pending} onClick={() => review({ email: member.email, role: "reviewer", expected: "new" })}>Restore as reviewer</button>}</div>
      </li>)}</ul>
      {!visible.length && <p>{query ? "No matching staff accounts." : showRemoved ? "No removed staff accounts." : "No staff accounts to show."}</p>}
    </section>
    <section className="email-panel"><h2>Recent access changes</h2><p>The latest 20 changes made through this panel.</p>{!data.events.length ? <p>No access changes recorded yet.</p> : <ul className="staff-history">{data.events.map(event => <li key={event.id}><strong>{event.target_email}</strong><span>{event.previous_role ? roleName(event.previous_role) : "No access"} → {event.new_role ? roleName(event.new_role) : "Access removed"}</span><small>{event.actor_email} · {new Date(event.created_at).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" })} Central</small></li>)}</ul>}</section>
    <dialog ref={dialog} className="staff-confirm-dialog" aria-labelledby="staff-confirm-title" onCancel={event => { if (pending) event.preventDefault(); }}>
      <h2 id="staff-confirm-title">{change?.role === "revoked" ? "Remove staff access?" : "Confirm access change"}</h2>
      <p><strong>{change?.email}</strong></p><p>{change?.role === "revoked" ? "This person will lose access to the application portal. Their member account and applications will remain." : `Grant ${roleName(change?.role ?? "reviewer").toLowerCase()} access to this account?`}</p>
      {change?.role === "admin" && <p>This includes publishing decisions and granting or removing other staff members’ access.</p>}
      {error && <p className="admin-notice admin-notice-error" role="alert">{error}</p>}
      <div className="staff-confirm-actions"><button type="button" disabled={pending} onClick={() => dialog.current?.close()}>Cancel</button><button type="button" className="admin-publish-all" disabled={pending} onClick={save}>{pending ? "Saving…" : change?.role === "revoked" ? "Confirm removal" : "Confirm access"}</button></div>
    </dialog>
  </div>;
}
