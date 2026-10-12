"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", index: "01", label: "Overview" },
  { href: "/dashboard/profile", index: "02", label: "Profile" },
  { href: "/dashboard/applications", index: "03", label: "Applications" },
];

export function DashboardNavigation() {
  const pathname = usePathname();

  return (
    <nav className="dashboard-navigation" aria-label="Applicant dashboard">
      {items.map((item) => {
        const active = item.href === "/dashboard"
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link href={item.href} aria-current={active ? "page" : undefined} key={item.href}>
            <span aria-hidden="true">{item.index}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
