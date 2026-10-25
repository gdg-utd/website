# Backend and password-workflow fixes — October 24, 2026

Implementation, local validation, and the approved Supabase deployment are complete. On October 24 (00:47 UTC October 25), both migrations were applied and all three email functions deployed. The named retry job is active every minute; its first real scheduled HTTP request returned 200 with `processed: 0, sent: 0`. The full regression suite runs in an isolated local PostgreSQL runtime.

The new frontend is also available on the public host, including `/reset-password` and the security headers. The migration backfilled application schema snapshots and repaired draft form versions. Tests did not change account passwords or send notification emails; the live queue contains six previously sent messages and no waiting messages.

## Changes deployed

| Finding | Implementation |
| --- | --- |
| F03 | A public, read-only academic catalog mirrors the existing website catalog. Database constraints validate profile degree/major pairs, and a trigger rejects invented application programs, including direct API writes. Incomplete drafts may keep a valid degree without a major. |
| F04 | RSVP confirmation requires `agreements_confirmed IS TRUE`. NULL response values are rejected too. Ownership, deadline, and state checks remain intact. |
| F05 | Added per-request script nonces and CSP, frame denial, MIME sniffing protection, referrer policy, device permission restrictions, and production HSTS. Session cookie refresh is preserved when forwarding nonce headers. Root pages render dynamically so scripts receive the correct nonce. |
| F06 | Intentionally left disabled: the project is on Free and Supabase's built-in leaked-password protection requires Pro or above. No plan upgrade or substitute external password service was introduced. |
| F15 | Immediate delivery and the worker share atomic queue leases. Explicit failures retry with backoff, up to five attempts. A minute-based worker handles at most five messages per run. Administrators can inspect delivery status and retry from the existing application review. Ambiguous network outcomes and expired delivery leases require provider review rather than blind automatic resends. Old/obsolete notifications are cancelled on reopen or decision changes. Provider acceptance is distinguished from inbox delivery. |
| F16 | Each decision publication uses its event ID for notification identity, with a separate stable provider UUID for retries. Reopening, resubmitting, and republishing the same decision creates a fresh notification instead of reusing the earlier one. |
| F18 | Staff filtering and aggregates run in PostgreSQL; lists load 25 applications per page. Review history loads 50 events at a time. CSV output streams in batches of 200, keeps historical question labels, protects against spreadsheet formula injection, and rejects exports over 500 question columns. |
| F19 | Draft versions synchronize when saved/submitted. Submitted applications retain a schema snapshot for review, agreements, and CSV labels. The existing drifted draft is repaired by the migration. Stale browser forms are rejected without discarding their entered responses. Existing submissions without snapshots are backfilled from the current schema; historical wording already lost before this update cannot be reconstructed automatically. |
| F27 | A server-only reservation checks account existence before consuming shared provider quota. Unknown addresses cannot exhaust that quota; per-account limits and generic public responses remain. |

Sources: [Supabase password security and plan availability](https://supabase.com/docs/guides/auth/password-security), [scheduled Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions), [Brevo idempotency](https://developers.brevo.com/docs/heterogenous-versions-batch-emails). Next.js nonce behavior was checked against the installed framework documentation.

## Password workflows

- **Signed in:** Profile → Reset password → `/dashboard/profile/password`. The server verifies the current password, updates the password, signs out other sessions, and returns to `/dashboard/profile?message=password-updated`.
- **Signed out:** Forgot password → generic confirmation → emailed reset link → verified callback → `/reset-password`. A signed, HttpOnly authorization expires after 15 minutes and is tied to the verified account and session. A normal login session or a query flag cannot substitute for a reset link. After the password update, recovery authorization and local auth cookies are cleared, sessions are signed out, and the user returns to `/login?password=updated` to log in again.
- If remote session revocation fails after a successful update, the user sees an explicit warning; recovery still clears local auth cookies so the login redirect works.
- Invalid/expired recovery authorization shows a request-new-link page. The forgot-password form remains reachable from that fallback even when an expired recovery flow has left a signed-in session.
- Existing reset-email links using the older profile destination still pass through recovery verification and reach the dedicated recovery page.
- There is no added email-confirmation button on login. The earlier unconfirmed-login redirect to OTP remains intact.

A server-only `PASSWORD_RECOVERY_SECRET` is required in the Next.js hosting environment. Generate at least 32 random bytes, keep it out of `NEXT_PUBLIC_` variables, and configure it before deploying the new callback. A local-only secret was generated in the ignored `.env.local`; no secret value is committed. Changing this secret invalidates outstanding recovery authorizations.

## Verification

- `npm run lint`, `npx tsc --noEmit`, and the production Webpack build pass.
- `npm test`: 14 regression groups, including signed recovery grants, password-flow destinations, credential/proof rejection, CSP rules, retry outcomes, and a 451-row CSV export across bounded batches.
- `npm run test:database`: replays the existing migrations into an isolated PostgreSQL runtime, seeds synthetic users/applications, applies the new migration, and tests program constraints, RSVP NULL guards, same-decision republication, schema snapshot protection, retry leases/limits, cancellation, pagination, quotas, and permissions. Supabase Auth helpers and Vault infrastructure are represented locally; `pg_cron` and `pg_net` installation is excluded from this local harness. The schedule SQL is executed against stubbed local scheduling/HTTP functions and its private token is validated without making an HTTP request. No production connection or real password is used. CI runs this suite.
- Deno checks pass for the three changed/new Edge Functions against the pinned Supabase client and lockfile.
- Local production HTTP checks verify HSTS, frame/MIME protections, matching script nonces, different nonces on consecutive requests, no production `unsafe-eval`, and removal of the framework version header. The signed-in account UI still works with CSP enabled, with no browser console errors in the checked password flow.
- Browser verification covers the real profile password link/subpage and the rejected recovery state without a reset link. Mobile and desktop screenshots are saved in the task's `backend-fixes` artifact folder.
- Pagination, notification states, and an authorized recovery-form layout were also checked with isolated fixture data, before production deployment. The 320px heading overflow found in that preview was fixed; final page width equals viewport content width. Fixture previews do not claim to validate live delivery.
- Live cron execution is verified separately from the local harness: the scheduled request returned HTTP 200 with an empty queue. A request without worker authorization returned HTTP 401. Real password changes and email inbox receipt still require the user test; the account password was not changed.

## Deployment record and remaining user test

1. **Needs hosting confirmation:** configure the server-only `PASSWORD_RECOVERY_SECRET` in Vercel Production and redeploy. Its presence cannot be verified through the public site. Retain existing Supabase and Brevo secrets.
2. **Applied:** `20261025004702_harden_applications_and_delivery.sql`. This added constraints/RPCs, repaired draft versions, backfilled schema snapshots, and created private worker authorization in Vault.
3. **Deployed:** `send-application-email`, `request-password-reset`, and `process-application-emails`, including shared delivery code and import maps. JWT settings match `supabase/config.toml`; the worker checks its private Vault token.
4. **Verified:** the worker rejects an unauthenticated request with HTTP 401. The queue contains no processing/pending/failed entries, and all six existing messages remain sent.
5. **Applied and running:** `20261025004741_schedule_application_email_retries.sql`. One active named job runs every minute, and consecutive scheduled requests returned HTTP 200 with no work.
6. **Verified:** live test-account login, admin list pagination display, application review, historical provider status, profile password subpage, and rejection of recovery access without email-link proof. Consecutive public HTTP requests have distinct script nonces matching every script, HSTS, frame denial, MIME protection, no production `unsafe-eval`, and no framework-version header. An unknown reset address returned generic HTTP 200 without adding quota records. Types were regenerated and lint, type checks, all 14 unit groups, and the database regression suite passed.
7. **Remaining user test:** complete a real password change and emailed recovery flow, verify return destinations and login with the new password, and confirm inbox receipt. Automated browser testing stops before entering a new password. Retry behavior was exercised with isolated test fixtures; the live worker was verified on an empty queue without publishing real applicant decisions.

Live post-deployment checks: 159 academic program pairs, a validated profile constraint, zero missing application snapshots, zero draft version drift, and no anon/member execution privilege on the claim, quota-reservation, or worker-auth helpers. Function versions: `send-application-email` 11, `request-password-reset` 3, `process-application-emails` 1. Local filenames match the migration versions recorded by Supabase. Database TypeScript types were regenerated from the deployed schema and type checking passed.

Post-deployment security advisors report the same three existing guarded authenticated SECURITY DEFINER endpoints, three intentionally server-only RLS tables without public policies, and disabled paid leaked-password protection. There are no additional security findings from this migration. See [function advisory guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) and [RLS advisory guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Performance advisors report five unused indexes, including newly created indexes on this small dataset; no removal was made based only on initial usage statistics. See [unused index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Reset quota feedback follow-up

Applied `20261025030929_report_password_reset_limits.sql` and deployed `request-password-reset` version 4. The service returns HTTP 429 with `RESET_LIMIT_REACHED` after three requests for an email in its one-hour window. The website server action displays that as an error, replacing the generic email-success message. Shared-provider saturation uses a separate temporary-unavailability message. Limits remain three requests per email and 500 provider reservations site-wide per hour; no cooldown was added.

Per-email request counters now apply equally to registered and unregistered addresses so the feedback does not reveal account existence. Unknown addresses still reserve no shared provider quota and generate no email. The older boolean reservation helper delegates to the new service-only helper for deployment compatibility.

Validation: all 14 unit groups and the isolated PostgreSQL suite pass, including equivalent unknown-address feedback, known-address limits, window expiry, global limits, and denied anonymous/member access. Lint and TypeScript checks pass. Four live requests for a non-existent test address returned 200, 200, 200, then 429; no email was sent. The actual local reset form connected to the live function displayed the limit alert, checked on desktop and 390px mobile. Production website feedback requires pushing the updated server action to main. Security advisors show no additional findings. Screenshots: `reset-quota-desktop.png` and `reset-quota-mobile.png` in the task artifact folder.
