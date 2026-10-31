# Implementation audit — October 31, 2026

## Assessment

The chapter website and core application portal are substantially implemented. The remaining work is concentrated in production verification, recovery from interrupted workflows, privacy and operations, and tools that let future officers administer the system without SQL. Building more application features is less urgent than proving the existing flows against hosted services and making them maintainable.

Reviewed repository commit: `9a1a90b2d582b447e4d9e452f7b92a4c16127529`.

Reviewed: public routes, authentication/onboarding, applicant forms and dashboard, staff review/publishing/export, database migrations and tests, email functions, security headers, operational documentation, the production homepage, and read-only Supabase metadata. The production website commit was not established. Its footer differs from the local shared footer, so local test success must not be treated as proof that every tested change is deployed.

No application source, production configuration, user accounts, decisions, or emails were changed during this review. The existing Google Sheets tracker was updated in place. This document records the reasoning and evidence behind those edits.

## Verification performed

| Check | Result | Limit |
| --- | --- | --- |
| ESLint | Passed | Static checks only |
| TypeScript `tsc --noEmit` | Passed | Not hosted-schema regeneration |
| Unit/regression tests | 14 passed | Synthetic inputs/provider outcomes |
| Database integration suite | Passed | Isolated PGlite; managed infrastructure stubbed |
| Production Webpack build | Passed | Synthetic service configuration |
| Browser suite | 32 passed | 16 flows each on desktop/mobile Chromium; local service double |
| Production homepage | Loaded; future November events visible | No complete production visual or authenticated-flow test |
| Live Supabase functions | Required three functions ACTIVE | Source parity/inbox delivery not established |
| Retry schedule | Active every minute; three recent SQL dispatches succeeded | SQL dispatch success does not prove HTTP worker response or inbox delivery |

The first build attempt could not resolve Google Fonts under restricted network access. Re-running the unchanged browser command with network access completed the build and all 32 tests. This was an environment limitation, not an application test failure.

## Already implemented

Seven roadmap entries were marked Done, with notes describing their scope:

- **CUR-004 — submitted schema snapshots:** `form_schema_snapshot` is stored and protected; review/API/CSV paths use it. Database regressions check immutability. Historical records backfilled after question changes cannot reconstruct questions that were never retained; snapshots reliably preserve future submissions from their capture point.
- **CUR-005 — automated check foundation:** CI and local commands cover regression tests, isolated database rules, production build, and desktop/mobile browser workflows. Further authorization coverage remains CUR-026.
- **CUR-006 — automatic email retries:** delivery leases, bounded attempts, idempotency, uncertain outcomes, and manual retry paths exist. The live retry worker and minute-by-minute Cron are active, and a worker secret is present without reading its value.
- **CUR-008 — password recovery:** UTD-only requests, quota feedback, verified recovery authorization, signed-in current-password verification, and separate completion paths are implemented. Hosted expiry/reuse/session revocation still require real-account evidence.
- **CUR-017 — review drawer focus behavior:** native modal dialog, initial focus, Escape, scroll locking and opener restoration exist. Manual screen-reader verification is still required.
- **CUR-019 — stale fallback events:** events are date-filtered and feed failure returns an unavailable state with no fallback events. Regression coverage passes.
- **FUT-013 — editable profile:** identity, academic program and contact/portfolio fields can be edited. Save/reload and failed-save preservation pass browser tests; applications retain identity snapshots.

Several other entries had obsolete descriptions. Per-application email status/retry, reopen confirmation, a custom not-found page, expected data-unavailable states, pagination and mobile width checks already exist. Their tasks now address the remaining gaps rather than proposing to rebuild those pieces.

## Highest-priority remaining work

### 1. Prove the hosted release and reconcile drift

**CUR-001, CUR-002, CUR-003, CUR-026.** There are 29 local migration files and 26 hosted history entries. This is not simply three unapplied changes: reset-limit, blacklist and industry-questionnaire migrations also have different timestamps. Local history entries for password-changed-template removal, cleared staging and onboarding are absent from the returned hosted history. The onboarding column nevertheless exists live. Compare effective definitions and intended behavior before repairing history; blindly applying every unmatched file could duplicate or overwrite existing behavior.

The live required functions were `send-application-email` v11, `request-password-reset` v4, and `process-application-emails` v1. An older `send-password-changed-email` function is also active although it is no longer in this repository. Determine whether anything still invokes it before deciding whether to retire it.

At inspection time the application queue contained 12 records marked sent and no other returned status groups. This means provider acceptance was recorded, not that messages reached inboxes. Use designated accounts/inboxes to verify signup OTP, password recovery, expired/reused links, password invalidation, other-session revocation, confirmation/decision emails and RSVP links. Record the production website commit and compare deployed function source with the repository.

Expand actual database-role tests. Much of the current SQL regression suite runs with an elevated fixture connection, while browser authorization responses come from a service double. The authenticated staff-read and explicit function-privilege checks are useful, but do not replace a matrix using two applicants, reviewer, admin and admin-applicant fixtures. Cover cross-user reads/writes, restricted RPCs, scoped bulk publishing across two openings, concurrent transitions and RSVP cutoff behavior.

### 2. Finish interrupted applicant journeys

**CUR-020 / BUG-002:** `saveApplication` redirects to login when claims are absent. It does not preserve the submitted form values across that redirect. The exact reported production generic-error symptom was not reproduced in this audit, but the loss-of-unsaved-input risk remains evident. Explain expiry and provide a safe copy/recovery or scoped draft mechanism before redirecting; combine with autosave and navigation warnings (FUT-001). Any browser persistence should have an explicit retention/cleanup policy for personal application responses.

**CUR-021 / BUG-003:** `ForgotPasswordForm` hard-codes its return link to `/login`; the successful recovery return also does not preserve the original application destination. Carry a validated internal destination through the full flow and add a regression starting at a specific opening.

**CUR-024 / BUG-001:** local signup reaches verification successfully, but that does not close the production loading-stall report. Keep it Ready to verify and retest against the current hosted release with a designated account.

**CUR-025 / BUG-004:** UI and database canonical program lists exist, and production has 159 degree-major pairs. Obtain the precise missing legitimate program, compare authoritative catalog data, and update both layers together if needed. Presence of a large catalog is not proof the tester's report is fixed. The previously blank bug ID was assigned BUG-004 and its summary cleaned up; the reporter's underlying report was retained.

### 3. Establish privacy and operating safeguards

**CUR-009:** the live security advisor still reports leaked-password protection disabled. Review availability under the current plan, enable it, and verify understandable rejection messages.

**CUR-023:** advisors flag authenticated execution of three SECURITY DEFINER RSVP/officer functions. These may be intentionally exposed RPCs; a warning alone does not establish an exploitable authorization bug. Review ownership/admin checks, grants and fixed search paths and exercise denied cases. RLS-enabled/no-policy notices for server-managed blacklist, reset-limit and email-template tables can be intentional denial of direct client access; do not add broad policies merely to silence advisories.

**CUR-013:** no privacy route or visible retention policy was found. Define collection purpose, access, retention, support, deletion/export requests, and treatment of profile data, application answers, events, email payloads and backups. Link the policy where applicants provide data. Self-service automation can wait until the policy and manual process exist.

**CUR-012:** Vercel Analytics is present, but it does not establish error alerting. The maintainer guide identifies log locations; no integrated incident alert path was found. Alert a named owner for unexpected application/worker failures and aging failed/uncertain deliveries, with redacted identifiers rather than answers or credentials.

**CUR-022:** the maintainer guide explains backups and explicitly does not set up automated backups. Establish private scheduled backups, retention, ownership and a documented isolated restore drill. Repository checkout and applicant CSV export are not substitutes for recovering the database and required configuration.

### 4. Make the portal maintainable

**CUR-010 / CUR-011:** opening/question/date management and staff access changes still require SQL. Add audited admin tools with input validation, version handling and protection against removing the last active admin. Clone/archive belongs in the same opening workflow rather than a second standalone task.

**CUR-007:** per-application delivery controls already work; add a global queue overview for pending, failed and uncertain items so admins can find problems without opening every application.

**CUR-015:** reopen confirmation already warns about clearing decisions, but there is no required reason or explicit prior-email consequence handling. Record an audited reason and define applicant notification policy.

**CUR-018:** staff list filters are server-side, but summary metrics aggregate the unfiltered base. CSV export takes no filters. Label global scope clearly or make summaries/export filter-aware while retaining an explicit export-all action.

**CUR-014 / CUR-016:** applicants cannot read their submitted answers; the submitted route shows a lock panel. Add a read-only snapshot-based copy. Add route error/loading boundaries; retain existing not-found and expected data-unavailable components.

Manual Safari/iOS, keyboard and screen-reader checks remain release work. Chromium phone emulation and a page-width assertion do not establish all mobile usability or accessible interaction behavior. Improve mobile triage based on observed usability rather than requiring a card layout without evidence.

## Backlog removed or consolidated

| Removed ID | Reason |
| --- | --- |
| FUT-007 — file uploads | Speculative scope; current applications already support portfolio URLs. Reintroduce only for an opening with a concrete private-upload requirement. |
| FUT-008 — clone/archive openings | Consolidated into CUR-010 opening management. |
| FUT-009 — bulk applicant communication | Separate communications system not required for the core application workflow; existing provider tools and decision notifications already serve current communication needs. Revisit if a specific operational need appears. |
| FUT-011 — standalone application analytics | Deferred speculative reporting expansion; resolve existing metrics/export scope first in CUR-018. |
| FUT-015 — role-specific overview | Avoid another speculative dashboard before assignment/queue workflows justify one; staff management and global queue health have concrete needs. |

Rubrics and reviewer assignments remain optional low-priority work. The homepage hackathon teaser became CUR-027: replace it with approved details/official registration when available or remove it if no longer planned. It does not justify building another registration backend now.

## Tracker outcome

Roadmap: 37 tasks, seven Done and 30 remaining; five removed/consolidated and eight added. Existing IDs, owners, native table styles and priority choices were preserved for retained tasks. Bugs retain original reporter/reproduction evidence with audit notes. Release checklist uses Passed only for narrowly observed outcomes, and leaves local-only/partial hosted coverage In progress. System map now includes RSVP, canonical programs, snapshots and current email processing.

Recommended sequence: interrupted applicant flows and security/hosted verification; privacy, monitoring and recoverability; opening/staff administration and scoped reporting; optional review conveniences after demonstrated demand.
