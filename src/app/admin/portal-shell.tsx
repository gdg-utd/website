"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

// Add future portal sections here; access is still enforced by each page.
const sections = [
  { href: "/admin/applications", label: "Applications", icon: "applications", adminOnly: false },
  { href: "/admin/email-health", label: "Email health", icon: "email", adminOnly: true },
];

export function PortalShell({ role, children }: { role: "admin" | "reviewer"; children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  return <div className={`portal-layout${collapsed ? " portal-collapsed" : ""}`}>
    <header className="portal-header">
      <Link href="/" aria-label="GDG UTDallas home"><Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} loading="eager" /></Link>
      <span>Application portal</span>
      <Link href="/dashboard">Member dashboard ↗</Link>
    </header>
    <div className="portal-body">
      <aside className="portal-sidebar" aria-label="Portal sidebar">
        <div className="portal-sidebar-heading"><span>Workspace</span><button type="button" aria-expanded={!collapsed} aria-controls="portal-navigation" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(value => !value)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>{collapsed ? <path d="m13 9 3 3-3 3"/> : <path d="m16 9-3 3 3 3"/>}</svg></button></div>
        <nav id="portal-navigation" aria-label="Portal navigation">
          {sections.filter(section => !section.adminOnly || role === "admin").map(section => <Link key={section.href} href={section.href} prefetch={false} aria-label={section.label} title={collapsed ? section.label : undefined} aria-current={pathname.startsWith(section.href) ? "page" : undefined}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{section.icon === "email" ? <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></> : <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>}</svg>
            <span>{section.label}</span>
          </Link>)}
        </nav>
      </aside>
      <div className="portal-content">{children}</div>
    </div>
  </div>;
}
