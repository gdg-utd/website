# Backend and password-workflow fixes — October 24, 2026

Implementation and local validation are complete. The live Supabase migrations, Edge Function deployments, and retry schedule have **not** been applied. Automatic approval review rejected persistent production changes without explicit deployment approval. The expanded production rollback test was also rejected; the complete regression suite was instead run in an isolated local PostgreSQL runtime.

Do not deploy the frontend alone: its application queries and admin portal expect the new schema and RPCs. Existing application records, account passwords, and notification delivery were not persistently changed during testing. No email provider was called by the tests.

## Changes prepared

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
- `npm test`: 12 regression groups, including signed recovery grants, password-flow destinations, credential/proof rejection, CSP rules, retry outcomes, and a 451-row CSV export across bounded batches.
- `npm run test:database`: replays the existing migrations into an isolated PostgreSQL runtime, seeds synthetic users/applications, applies the new migration, and tests program constraints, RSVP NULL guards, same-decision republication, schema snapshot protection, retry leases/limits, cancellation, pagination, quotas, and permissions. Supabase Auth helpers and Vault infrastructure are represented locally; `pg_cron` and `pg_net` installation is excluded from this local harness. The schedule SQL is executed against stubbed local scheduling/HTTP functions and its private token is validated without making an HTTP request. No production connection or real password is used. CI runs this suite.
- Deno checks pass for the three changed/new Edge Functions against the pinned Supabase client and lockfile.
- Local production HTTP checks verify HSTS, frame/MIME protections, matching script nonces, different nonces on consecutive requests, no production `unsafe-eval`, and removal of the framework version header. The signed-in account UI still works with CSP enabled, with no browser console errors in the checked password flow.
- Browser verification covers the real profile password link/subpage and the rejected recovery state without a reset link. Mobile and desktop screenshots are saved in the task's `backend-fixes` artifact folder.
- Pagination, notification states, and an authorized recovery-form layout were also checked with isolated fixture data, because the production migration is pending. The 320px heading overflow found in that preview was fixed; final page width equals viewport content width. Fixture previews do not claim to validate live delivery.
- Real password changes, email receipt, cron execution, and full production end-to-end checks remain for the approved deployment/user test. The test account's password was not changed.

## Deployment order after approval

1. Configure the server-only `PASSWORD_RECOVERY_SECRET` in the Next.js host. Retain the existing Supabase and Brevo secrets.
2. Apply `20261024222318_harden_applications_and_delivery.sql` using a transaction-aware migration tool. This adds constraints/RPCs, repairs the draft version, backfills schema snapshots, and creates private worker authorization in Vault. Review any constraint failure rather than deleting or silently rewriting invalid user data.
3. Deploy `send-application-email`, `request-password-reset`, and `process-application-emails`, including `supabase/functions/_shared/application-email.ts` and their import maps. `supabase/config.toml` records the JWT settings; the worker explicitly validates its Vault token. The immediate send function still validates the user's session and application/admin access.
4. Confirm old in-flight delivery requests have drained, validate the worker's unauthorized-request rejection, and check the pending queue before enabling the schedule. Historical ambiguous failures need administrator review.
5. Apply `20261024223412_schedule_application_email_retries.sql`. It invokes the worker once per minute with a Vault credential over HTTPS; no credential is stored in source.
6. Deploy the website, regenerate database types from the deployed schema, run Supabase advisors, and repeat the browser/HTTP smoke checks against the deployed host.
7. Have the user complete a real password change and email recovery test, then verify the return destinations and new-password login. Verify delivery using an authorized test notification, including retry behavior, without publishing real applicant decisions just to test email.

The existing live advisor findings include intentional authenticated SECURITY DEFINER endpoints with role/ownership checks and server-only RLS tables without public policies. New admin delivery implementations live in the private schema behind invoker wrappers; worker/reset helpers are service-role only. Re-run advisors after the approved migration to check the deployed result.
