// Fixed loopback destinations: browser tests never inherit production service URLs.
module.exports = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:4319',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser_tests_only',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3100',
  PASSWORD_RECOVERY_SECRET: 'browser-tests-only-secret-not-used-by-any-deployed-environment',
  NEXT_TELEMETRY_DISABLED: '1',
};
