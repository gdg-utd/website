export function contentSecurityPolicy(
  nonce: string,
  development: boolean,
  supabaseUrl: string,
) {
  const supabase = new URL(supabaseUrl);
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    `connect-src 'self' ${supabase.origin} wss://${supabase.host} https://vitals.vercel-insights.com https://va.vercel-scripts.com${development ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!development ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}
