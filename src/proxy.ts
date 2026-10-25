import type { NextRequest } from "next/server";
import { contentSecurityPolicy } from "@/lib/security-headers";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "development",
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = await updateSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
