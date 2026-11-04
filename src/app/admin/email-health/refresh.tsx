"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshEmailHealth() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button className="admin-export" type="button" disabled={pending} aria-busy={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Refreshing…" : "Refresh overview ↻"}</button>;
}
