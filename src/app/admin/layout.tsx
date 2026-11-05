import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireApplicationStaff } from "@/lib/application-admin";
import { PortalShell } from "./portal-shell";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { role } = await requireApplicationStaff();
  return <PortalShell role={role}>{children}</PortalShell>;
}
