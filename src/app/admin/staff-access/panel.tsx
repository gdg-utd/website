"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StaffAccessData } from "@/lib/staff-access";
import { updateStaffAccess } from "./actions";

type Change = { email: string; role: string; expected: string };
const roleName = (role: string) => role === "admin" ? "Administrator" : "Reviewer";

export function StaffAccessPanel({ data, currentUserId }: { data: StaffAccessData; currentUserId: string }) {
  const router = useRouter();
  const addDialog = useRef<HTMLDialogElement>(null);
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

  function review(next: Change) { addDialog.current?.close(); setChange(next); setError(""); dialog.current?.showModal(); }
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
    <div className="staff-page-toolbar"><div className="staff-counts"><span><strong>{active.length}</strong> people with access</span><span>{active.filter(m => m.role === "admin").length} admin · {active.filter(m => m.role === "reviewer").length} reviewers</span></div><button type="button" className="staff-primary-button" onClick={() => addDialog.current?.showModal()}><span aria-hidden="true">＋</span> Add staff</button></div>
    {message && <p className="staff-success" role="status"><span aria-hidden="true">✓</span> {message}</p>}
    <section className="staff-directory" aria-label="Staff directory">
      <div className="staff-directory-toolbar"><div className="staff-view-tabs"><button type="button" aria-pressed={!showRemoved} onClick={() => setShowRemoved(false)}>{showRemoved ? "Show current staff" : "Current staff"} <span>{active.length}</span></button><button type="button" aria-pressed={showRemoved} onClick={() => setShowRemoved(true)}>Show removed staff <span>{data.members.length-active.length}</span></button></div>
      <label className="staff-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><span className="sr-only">Search staff</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search people…" /></label></div>
      <div className="staff-list-heading" aria-hidden="true"><span>Person</span><span>Access level</span><span>Manage access</span></div>
      <ul className="staff-members">{visible.map(member => <li key={member.user_id}>
        <div className="staff-person"><span className="staff-avatar" aria-hidden="true">{(member.name || member.email).split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase()}</span><div className="staff-member-identity"><strong>{member.name || member.email}{member.user_id === currentUserId && <span className="staff-you">You</span>}</strong><span>{member.email}</span></div></div>
        <span className={`staff-role-badge staff-role-${member.active ? member.role : "removed"}`}><span aria-hidden="true">●</span>{member.active ? roleName(member.role) : "Removed"}</span>
        <div className="staff-member-actions">{member.user_id === currentUserId ? <small title="Another administrator can change your access.">Your account</small> : member.active ? <><button type="button" disabled={pending} onClick={() => review({ email: member.email, role: member.role, expected: member.role })}>Change access</button><button type="button" className="staff-remove" disabled={pending} onClick={() => review({ email: member.email, role: "revoked", expected: member.role })}>Remove access</button></> : <button type="button" disabled={pending} onClick={() => review({ email: member.email, role: "reviewer", expected: "new" })}>Restore as reviewer</button>}</div>
      </li>)}</ul>
      {!visible.length && <div className="staff-empty"><span aria-hidden="true">⌕</span><h2>{query ? "No matching people" : "No removed staff"}</h2><p>{query ? "Try another name or email address." : "People whose access is removed will appear here."}</p></div>}
      <footer className="staff-directory-footer"><span>{visible.length} {visible.length === 1 ? "person" : "people"}</span><span>Only administrators can manage access.</span></footer>
    </section>
    <details className="staff-history-panel"><summary><span>Recent access changes <small>{data.events.length ? `${data.events.length} recorded` : "No changes yet"}</small></span><span className="staff-history-arrow" aria-hidden="true">⌄</span></summary>{!data.events.length ? <p>No access changes recorded yet.</p> : <ul className="staff-history">{data.events.map(event => <li key={event.id}><span className="staff-history-dot" aria-hidden="true"/><div><strong>{event.target_email}</strong><span>{event.previous_role ? roleName(event.previous_role) : "No access"} → {event.new_role ? roleName(event.new_role) : "Access removed"}</span><small>{event.actor_email} · {new Date(event.created_at).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" })} Central</small></div></li>)}</ul>}</details>
    <dialog ref={addDialog} className="staff-confirm-dialog staff-add-dialog" aria-labelledby="staff-add-title">
      <span className="staff-dialog-eyebrow">Workspace access</span><h2 id="staff-add-title">Add someone to the team</h2><p>Grant access to an existing website account.</p>
      <form onSubmit={event => { event.preventDefault(); review({ email: email.trim().toLowerCase(), role, expected: "new" }); }}>
        <label>Account email<input type="email" autoComplete="off" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="name@utdallas.edu" /></label>
        <label>Access level<select value={role} onChange={event => setRole(event.target.value)}><option value="reviewer">Reviewer</option><option value="admin">Administrator</option></select></label>
        <div className="staff-permission-note"><strong>{roleName(role)}</strong><p>{role === "admin" ? "Can publish decisions, manage email reporting, and manage the team’s access." : "Can review submitted applications and stage decisions for an administrator."}</p></div>
        <p className="staff-form-hint">They must have a website account. No invitation email is sent.</p>
        <div className="staff-confirm-actions"><button type="button" onClick={() => addDialog.current?.close()}>Cancel</button><button type="submit" className="staff-primary-button" disabled={pending}>Review access</button></div>
      </form>
    </dialog>
    <dialog ref={dialog} className="staff-confirm-dialog staff-add-dialog" aria-labelledby="staff-confirm-title" onCancel={event => { if (pending) event.preventDefault(); }}>
      <span className="staff-dialog-eyebrow">Workspace access</span>
      <h2 id="staff-confirm-title">{change?.role === "revoked" ? "Remove staff access?" : change?.expected !== "new" ? "Change access" : "Confirm access change"}</h2>
      <p><strong>{change?.email}</strong></p><p>{change?.role === "revoked" ? "This person will lose access to the application portal. Their member account and applications will remain." : `Grant ${roleName(change?.role ?? "reviewer").toLowerCase()} access to this account?`}</p>
      {change && change.role !== "revoked" && change.expected !== "new" && (
        <label className="staff-access-level">Access level
          <select value={change.role} disabled={pending} onChange={event => { setChange({ ...change, role: event.target.value }); setError(""); }}>
            <option value="reviewer">Reviewer</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
      )}
      {change?.role === "admin" && <p>This includes publishing decisions and granting or removing other staff members’ access.</p>}
      {error && <p className="admin-notice admin-notice-error" role="alert">{error}</p>}
      <div className="staff-confirm-actions"><button type="button" disabled={pending} onClick={() => dialog.current?.close()}>Cancel</button><button type="button" className="admin-publish-all" disabled={pending || change?.role === change?.expected} onClick={save}>{pending ? "Saving…" : change?.role === "revoked" ? "Confirm removal" : "Confirm access"}</button></div>
    </dialog>
  </div>;
}
