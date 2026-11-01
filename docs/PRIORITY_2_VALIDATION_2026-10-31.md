# Priority 2 production verification — October 31, 2026

## Deployed changes

- Password-reset Edge Function: `request-password-reset` version **5**, ACTIVE. Deployed source and import map match the repository. JWT verification remains disabled as previously configured for signed-out recovery; request quotas and UTD account checks remain enforced.
- Website: Vercel production deployment **dpl_Hr9Pfu3h7sUwUDBSnbpjcdmtauXo**, Ready, serving `www.gdgutd.com` and `gdgutd.com`. It contains the tested working tree based on commit `73129c135b7918ee618cbca28fb49daf7fb20dd1`; the additional source changes still need committing/pushing to the repository.
- Database: `20261031201115_add_scoped_admin_reopen` applied. Database types regenerated from the hosted schema.
- Existing `send-application-email` v11 and `process-application-emails` v1 are ACTIVE; their entrypoints, shared delivery implementation, and import maps match the repository.

No password, recovery token, provider credential, or applicant response is recorded in this report.

## Bugs found and fixed

### Admin reopening crossed the draft privacy boundary

An authenticated admin could publish an application but could not return another applicant's submission to draft. Actual-role regression tests reproduced `new row violates row-level security policy for table applications` locally and against the hosted database. Earlier elevated-connection regression tests did not expose the failure.

The fix provides `public.reopen_application(bigint)`, an invoker wrapper around a private, narrowly scoped transition. The private implementation requires an authenticated active administrator, updates only the requested submitted application, and returns whether it changed a row. Existing triggers still clear the decision, record reopening, remove RSVP state and cancel obsolete pending notifications. The operation does not grant staff read access to private drafts. Anonymous callers, applicants and reviewers are denied even if the private helper is called directly.

The server action now calls this operation and treats a stale/already-draft target as a failed reopen rather than reporting success. Browser coverage confirms reopening and applicant resubmission.

### Automatic link visits consumed recovery tokens

Two email test tokens were consumed before the tester or agent opened them interactively. An email scanner or automatic link preview followed the GET callback, which immediately exchanged the token. This was independent of password selection; the account password was not changed by those visits.

Recovery-token GET requests now redirect to `/auth/recovery` without exchanging the token. Only pressing **Continue to reset password** submits the verification action. The page uses a no-referrer policy and inherits the auth no-index metadata. The action validates the destination, verifies the token, creates the existing signed/session-bound recovery authorization, and redirects to the reset form. Existing email callback links remain compatible.

Live verification confirmed that the third token remained pending after automatic preview and opening its landing page. Explicit confirmation then opened the real reset form with `next=/apply/sprint-mentee`. The account owner reported that resetting and logging in with the new password worked. The observed browser destination after login was `/apply/sprint-mentee`.

## Database parity and history reconciliation

Compared an isolated database built from repository migrations with the hosted database. Columns, defaults/nullability, policy definitions, function source/signatures/security settings, RLS flags, and shared constraints matched. PostgreSQL-version-specific NOT NULL catalog entries were excluded because column nullability was compared separately. The only intended functional addition was the new reopen operation; final comparison including it passed in every category.

Three historical timestamps were reconciled by migration name while preserving their existing recorded statements:

| Hosted timestamp before | Repository timestamp | Migration |
| --- | --- | --- |
| 20261013030858 | 20261013025939 | add_password_reset_rate_limits |
| 20261020030753 | 20261020030714 | add_signup_email_blacklist |
| 20261020032110 | 20261020032045 | update_industry_officer_questionnaire |

Marked three already-effective changes as applied: password-changed-template removal, cleared staging, and profile onboarding completion. The password-changed template was already absent, staging constraints/policies matched, and the onboarding column already existed. Existing profiles were not backfilled again, and old opening/questionnaire data updates were not replayed.

After applying the reopen migration, hosted and repository history contain **30 matching migration versions**. The local filename was aligned with the actual version recorded by the deployment tool. The older, unused `send-password-changed-email` function was left untouched; deleting it requires confirming that no external caller still uses it.

## Actual-role workflow tests

`tests/authorization-regressions.sql` runs with real `anon` and `authenticated` database roles, not only the database owner's access. Four dummy identities and scoped openings/applications exist only inside a transaction, then are rolled back. No queued notification from these tests becomes visible to the worker.

Verified:

- Anonymous profile/application reads and publishing/reopening are denied.
- Applicants see and update only their own profile and draft; forged ownership and self-promotion fail.
- Cross-applicant draft/submission/profile reads and writes fail or affect zero rows.
- Applicants cannot read internal history/delivery data or call staff/retry/reopen operations.
- Reviewers read submissions and stage/clear decisions but cannot publish, reopen, release expired offers, or inspect admin-only delivery details.
- Admin publishing affects only the selected opening; repeat publishing changes zero rows.
- Admin reopening works while the reopened draft stays hidden from staff reads.
- An admin who is also an applicant can reopen, edit and resubmit their own application.
- Applicants can resubmit reopened applications with a cleared decision.
- RSVP ownership, required agreements including NULL, exact cutoff, confirmation, duplicate-response rejection, expired-offer release, and repeated-release idempotency are enforced.

The suite passed locally and against the hosted database after the fix. Cleanup readback confirmed no transaction-only dummy users or openings remained. These tests exercise actual database roles and hosted functions; they are not a claim that four persistent users each completed all production browser flows. Simultaneous multi-session load/race testing was not performed.

## Real email checks

The owner authorized the UT Dallas inbox for testing. Three clearly labeled application-email fixtures exercised the existing confirmation, acceptance, and rejection templates through the scheduled worker. No real application decision was changed.

The scheduled HTTP call returned 200 with `processed: 3, sent: 3`. Each queued item had one delivery attempt and a provider message ID. The owner confirmed all three messages arrived. Password-reset email delivery and destination preservation were also confirmed through the live recovery flow.

The disposable email-test draft, opening and queue items were deleted after delivery. Readback confirmed zero test openings/queue items and that the owner's original account still existed. No original applications were deleted. Controlled provider failure/timeout behavior remains covered by isolated tests rather than deliberately disrupting the production provider.

## Automated validation

- ESLint and TypeScript: passed.
- Unit/regression tests: **15 passed**.
- Isolated PostgreSQL regressions, actual-role authorization matrix and schema snapshot: passed.
- Production build: passed.
- Desktop/mobile Chromium: **54 passed** across 27 flows, including scanner-safe recovery, token reuse rejection, reopening/resubmission and all Priority 1 regressions.
- Live database role matrix: passed; fixtures rolled back.
- Live recovery token reuse: rejected with the invalid/expired-link message after successful verification; the selected application destination remained attached.

## Remaining evidence limits

The owner confirmed reset/new-password login and inbox delivery. A fresh production signup/OTP account was not created, the old password was not supplied to the agent, and revocation of every other real browser session was not independently observed. Those checks must not be marked fully proven merely because unit/browser fixtures pass. The signup-stall report remains a low-priority controlled retest; no reproducible signup defect was established. The degree report still needs the specific allegedly missing program before a catalog change is justified.

Safari/iOS and assistive-technology validation remain outside the Chromium checks. No optional staff-management UI, autosave, or premium password feature was added.
