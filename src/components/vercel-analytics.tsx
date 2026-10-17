"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

const PRIVATE_ROUTE_PREFIXES = [
  "/account",
  "/admin",
  "/apply/",
  "/auth",
  "/dashboard",
  "/login",
  "/onboarding",
  "/signup",
];

function isPrivateRoute(pathname: string) {
  return PRIVATE_ROUTE_PREFIXES.some((prefix) => {
    if (prefix.endsWith("/")) return pathname.startsWith(prefix);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

function filterAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url, window.location.origin);

  if (isPrivateRoute(url.pathname)) return null;

  url.search = "";
  url.hash = "";

  return { ...event, url: url.toString() };
}

export function VercelAnalytics() {
  return <Analytics beforeSend={filterAnalyticsEvent} />;
}
