import "server-only";
import { cookies } from "next/headers";
import { signRecoveryGrant, validRecoveryGrant } from "@/lib/recovery-grant";

const COOKIE = "gdg-password-recovery";
export async function allowPasswordRecovery(userId: string, sessionId: string) {
  const secret = process.env.PASSWORD_RECOVERY_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Password recovery signing secret is not configured");
  const store = await cookies();
  store.set(COOKIE, signRecoveryGrant(userId, sessionId, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });
}
export async function canRecoverPassword(userId: string, sessionId: string) {
  const store = await cookies();
  return validRecoveryGrant(
    store.get(COOKIE)?.value,
    userId,
    sessionId,
    process.env.PASSWORD_RECOVERY_SECRET ?? "",
  );
}
export async function clearPasswordRecovery() {
  (await cookies()).delete(COOKIE);
}

export async function clearLocalAuthCookies() {
  const store = await cookies();
  const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(
    ".",
  )[0];
  const prefix = `sb-${project}-auth-token`;
  for (const cookie of store.getAll())
    if (cookie.name.startsWith(prefix)) store.delete(cookie.name);
}
