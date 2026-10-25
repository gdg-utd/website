import { createHmac, timingSafeEqual } from "node:crypto";

type RecoveryGrant = { userId: string; sessionId: string; expires: number };
export function signRecoveryGrant(
  userId: string,
  sessionId: string,
  secret: string,
  now = Date.now(),
) {
  const payload = Buffer.from(
    JSON.stringify({ userId, sessionId, expires: now + 15 * 60 * 1000 }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}
export function validRecoveryGrant(
  value: string | undefined,
  userId: string,
  sessionId: string,
  secret: string,
  now = Date.now(),
) {
  if (!value || !secret) return false;
  try {
    const [payload, signature, ...extra] = value.split(".");
    if (!payload || !signature || extra.length) return false;
    const expected = createHmac("sha256", secret).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return false;
    const grant = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as RecoveryGrant;
    return (
      grant.userId === userId &&
      grant.sessionId === sessionId &&
      Number.isFinite(grant.expires) &&
      grant.expires > now
    );
  } catch {
    return false;
  }
}
