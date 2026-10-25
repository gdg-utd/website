<p align="center">
  <img src="./assets/readme-gdg-mark.svg" alt="Google Developer Groups" width="72" height="40" />
</p>

<h1 align="center">The maintainer’s guide</h1>

<p align="center">Keep the chapter’s website useful, dependable, and easy to hand over.</p>

<p align="center">
  <img src="./assets/readme-divider.svg" alt="" width="100%" height="4" />
</p>

This guide is for the officers and developers responsible for the GDG UTDallas website. Start with the [README](../README.md) for the project overview and local setup. Use this document when changing the site, deploying backend updates, managing staff access, or investigating a problem.

**This is an operating guide, not a record that every procedure has already been completed.** Historical checks and their limits are recorded in the [backend validation notes](./backend-fixes-validation.md) and [UI validation notes](./ui-fixes-validation.md).

## Jump to a task

- [Understand the system](#understand-the-system)
- [Get access and configure environments](#get-access-and-configure-environments)
- [Make and verify a change](#make-and-verify-a-change)
- [Deploy safely](#deploy-safely)
- [Manage application staff](#manage-application-staff)
- [Run an application cycle](#run-an-application-cycle)
- [Understand email delivery](#understand-email-delivery)
- [Troubleshoot account recovery](#troubleshoot-account-recovery)
- [Find and investigate failures](#find-and-investigate-failures)
- [Back up and recover data](#back-up-and-recover-data)
- [Hand over to the next maintainers](#hand-over-to-the-next-maintainers)

## Understand the system

| Component | Responsibility | Where to look |
| --- | --- | --- |
| Next.js on Vercel | Public website, dashboard, staff portal, server actions, and auth callbacks | `src/app/`, `src/components/`, `src/proxy.ts` |
| Supabase Auth | Accounts, sessions, email verification, and password updates | `src/lib/supabase/`, `src/app/auth/` |
| Supabase PostgreSQL | Profiles, applications, decisions, permissions, and email queue | `supabase/migrations/` |
| Supabase Edge Functions | Recovery email requests and application email delivery | `supabase/functions/` |
| Supabase Cron + Vault | Scheduled retry calls and private worker authorization | Retry schedule migration and Supabase dashboard |
| Brevo | Transactional email templates and delivery | Brevo dashboard |
| Official GDG chapter platform | Upcoming event information and event RSVPs | `src/lib/gdg.ts` |
| GitHub Actions | Automated repository checks | `.github/workflows/checks.yml` |

A website deployment does **not** deploy database migrations or Edge Functions. Those are separate release steps.

### Common editing locations

| Change | Starting point |
| --- | --- |
| Homepage, chapter information, or officers | `src/app/page.tsx`, `src/app/about/page.tsx`, `src/app/officers/page.tsx` |
| SPRINT content and gallery | `src/app/sprints/` and `public/pictures/sprint/` |
| Community links and event integration | `src/lib/gdg.ts` |
| Shared appearance | `src/app/globals.css` and `src/components/` |
| Application form rendering and validation | `src/app/apply/`, `src/lib/applications.ts` |
| Staff review and publishing | `src/app/admin/applications/`, `src/lib/application-admin.ts` |
| Academic program catalog | `src/lib/utd-academic-programs.ts` and the database catalog |
| Image sources and attribution | `ASSETS.md` and the `SOURCES.md` files under `public/` |

Keep frontend and database program validation in sync. Record database catalog changes in a new migration.

## Get access and configure environments

An incoming maintainer may need GitHub repository access, Vercel project access, Supabase project access, Brevo access, and access to the domain/DNS provider. Store the actual owners, project identifiers, billing contacts, and recovery arrangements in a private handover record.

**Application portal roles are separate from provider access.** Being a website administrator does not grant Vercel or Supabase dashboard access, and provider collaborators do not automatically receive application portal access.

Use individual accounts. Transfer ownership through each provider’s normal invitation/transfer process rather than sharing account passwords.

### Local development

Use Node.js 22 from [`.nvmrc`](../.nvmrc). Run `npm ci`, copy [`.env.example`](../.env.example) to `.env.local`, fill in the variables, then run `npm run dev`.

Use a separate development Supabase project and synthetic applicant data for changes to application state or email behavior. A Vercel preview is not automatically isolated: if its variables point to production Supabase or Brevo, its actions can affect production.

The local PostgreSQL test harness does not require Docker or a live Supabase project. It simulates selected Auth/Vault infrastructure; it is not a complete replacement for testing hosted authentication and email delivery.

When adding a migration, update `tests/database.integration.cjs` so the new SQL is exercised in the intended order, and add meaningful regressions in `tests/database-regressions.sql`. The harness currently loads some later migrations explicitly; adding a file alone does not guarantee the test suite runs it.

### Environment ownership

| Variable | Where it belongs | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Next.js local/Vercel environment | Points to the intended database project |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Next.js local/Vercel environment | Browser-safe key; database policies still control access |
| `NEXT_PUBLIC_SITE_URL` | Next.js local/Vercel environment | Local origin in development; canonical website origin in production |
| `PASSWORD_RECOVERY_SECRET` | Next.js server environment | Private random secret; keep stable between deployments |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | Supabase Edge Function secrets | Private key and verified sender |
| `BREVO_SENDER_NAME` | Supabase Edge Function secrets | Normally `GDG UTDallas` |
| `BREVO_REPLY_TO` | Supabase Edge Function secrets | Optional reply address |
| `SITE_URL` | Supabase Edge Function secrets | Public origin used in emailed links |
| Supabase service credentials | Supabase function runtime | Privileged server credentials; never send to the browser |
| `PASSWORD_RESET_RATE_LIMIT_SECRET` | Supabase Edge Function secrets, if configured | Optional hash secret; function otherwise uses its service key |

The Brevo placeholders in `.env.example` do not configure deployed Edge Functions. Set the function secrets separately.

Generate a new recovery signing secret with `openssl rand -hex 32` only when establishing an environment or intentionally rotating it. Changing it invalidates outstanding recovery authorizations. Do not paste secret values into issues, documentation, screenshots, or logs.

The worker token named `application_email_worker_token` lives in Supabase Vault. The schedule retrieves it privately. It is separate from `PASSWORD_RECOVERY_SECRET`; it does not belong in the README or Vercel’s public variables.

## Make and verify a change

1. Start a focused branch and keep unrelated changes separate.
2. Read [AGENTS.md](../AGENTS.md). For framework changes, consult the documentation bundled with the installed Next.js version.
3. Use `npm ci` so the lockfile determines dependencies.
4. Make the smallest complete change and update relevant documentation.
5. Run the checks below. Review the diff for accidental data, credentials, or generated artifacts.
6. For interface changes, inspect desktop and narrow mobile views, keyboard focus, and loading/error states.

```bash
npm run lint
npm test
npm run test:database
npx next typegen
npx tsc --noEmit
npm run build -- --webpack
git diff --check
```

The build uses the environment configured for that build; it may fetch public chapter information. Tests use mocks and synthetic data, but ordinary browser use against production remains real activity.

GitHub Actions currently runs lint, both test suites, route type generation, and TypeScript checks. **It does not currently run the production build or automated browser tests.** Run the build separately and perform the manual checks appropriate to the change.

### Critical browser checks

| Area | Verify |
| --- | --- |
| Public pages | Navigation, mobile menu, images, event links, and unavailable-feed state |
| Accounts | Signup verification, unconfirmed-login redirect to OTP, login, and logout |
| Profile | Validation, successful save, and preserved input after a failed save |
| Applications | Save draft, resume it, validate required fields/agreements, submit, and view status |
| Staff portal | Role restrictions, search/filtering, pagination, review, and CSV export |
| Decisions and RSVP | Authorized test publication, applicant visibility, confirmation, and expired-offer handling |
| Passwords | Both workflows in the recovery section below |

Use designated test accounts and disposable development applications. Publishing a decision can send a real email; do not publish real applicant decisions just to test the interface.

## Deploy safely

### Before a release

Confirm the target project and environment, review CI, run the production build, and identify whether the change touches the website, database, functions, templates, or schedule. For data-changing migrations, have a recent usable backup and a recovery plan.

Create database migrations with the installed Supabase CLI’s `migration new` command. Never edit an already-applied migration to change production behavior; add a new migration instead. Check the installed CLI’s `--help` before using deployment commands.

Compare local and remote migration history before applying anything. Some older local migration timestamps may differ from historical remote entries. Investigate discrepancies by comparing the actual SQL and recorded deployment history. Do not replay migrations or mark them applied merely to silence a mismatch.

### Release order

1. **Configuration:** Prepare required environment values in the correct service. Verify Supabase Auth Site URL and allowed redirect URLs match the intended environment.
2. **Database:** Apply reviewed schema changes before code that requires them. Prefer changes compatible with the currently deployed code during the transition.
3. **Functions:** Deploy changed Edge Functions, including their import maps and shared dependencies.
4. **Retry schedule:** Enable or change scheduling only after the worker is deployed and its authorization works. Do not enable a second copy of the same job.
5. **Website:** Deploy the intended commit through Vercel. Environment changes require a new deployment; check the Production/Preview scope.
6. **Verification:** Check the deployed pages, relevant backend operation, and logs. Record the commit, migration versions, function versions, and results in the release notes.

[`supabase/config.toml`](../supabase/config.toml) records the function entrypoints, import maps, and JWT settings. Preserve these distinctions:

| Function | Gateway JWT check | Additional protection |
| --- | --- | --- |
| `send-application-email` | Enabled | Valid user session and application/staff authorization |
| `request-password-reset` | Disabled | Public recovery entrypoint with server-side quotas |
| `process-application-emails` | Disabled | Private Vault-backed worker token checked inside the function |

Disabling gateway JWT checks does not make the worker open for public use. An unauthenticated worker request should return **401**. A scheduled empty-queue run can correctly return **200** with zero processed messages.

The current retry schedule migration contains the production function URL. **Do not copy that schedule unchanged into a development project.** Point a development schedule at its own function and Vault token, or leave retries disabled there.

After database changes, regenerate `src/lib/supabase/database.types.ts` from the target schema, inspect the diff, and rerun type checks. Run Supabase’s security advisors and investigate new findings; do not disable database policies to make an error disappear.

References: [Supabase CLI](https://supabase.com/docs/reference/cli/introduction), [function deployment](https://supabase.com/docs/guides/functions/deploy), and [scheduled functions](https://supabase.com/docs/guides/functions/schedule-functions).

### If a release fails

A Vercel rollback restores website code, not the database, functions, templates, or outgoing emails. Confirm the older code is compatible with the current schema before restoring it. For a database issue, prefer a reviewed corrective migration; avoid dropping tables or blindly reversing migrations containing user data.

Record the affected deployment and timestamps, inspect the first useful error, fix the cause, and repeat the specific failed user journey. Do not repeatedly republish decisions or resend email as a generic recovery step.

## Manage application staff

A staff member must first create a website account. A project administrator can then run the following in the intended Supabase project. Replace the example email and select either `reviewer` or `admin` deliberately.

```sql
insert into public.application_admins (user_id, role, active)
select id, 'reviewer', true
from auth.users
where email = 'new-officer@utdallas.edu'
on conflict (user_id) do update
set role = excluded.role, active = true;
```

No matching account means no row is added. Verify the assigned account and role:

```sql
select u.email, a.role, a.active
from public.application_admins a
join auth.users u on u.id = a.user_id
where u.email = 'new-officer@utdallas.edu';
```

| Role | Access |
| --- | --- |
| Reviewer | Read submitted applications and stage decisions |
| Administrator | Reviewer access, plus publishing, reopening, exports, and administrator-only operations |

Verify the account can open `/admin/applications` and sees the expected controls. Use the UI and existing server/database authorization together; hiding a button is not an access-control mechanism.

To revoke portal access while preserving the staff record:

```sql
update public.application_admins a
set active = false
from auth.users u
where u.id = a.user_id
  and u.email = 'departing-officer@utdallas.edu';
```

Deactivation blocks subsequent protected staff requests; it cannot retract information already viewed or downloaded. Remove separate GitHub, Vercel, Supabase, Brevo, and DNS access during offboarding too.

## Run an application cycle

Before opening applications, review the opening’s status, dates, form version, questions, options, agreements, and email template mapping in the database. Opening/form management is not a general-purpose editor in the website; make deliberate database changes through reviewed migrations.

When questions change, update the form version. Existing submissions use their saved schema snapshot; stale open browser forms are rejected so applicants can reload before continuing. Historical wording lost before snapshots were introduced cannot be reconstructed from the snapshot feature.

Use the staff portal to review, stage, and publish decisions. Staging and publishing are separate actions: staging prepares a decision; publishing makes it visible and queues a notification. Reopening and republishing can produce a new notification even when the decision is the same.

Accepted SPRINT mentees receive a 72-hour response window. Inspect RSVP status and use the staff expiry/release controls before reallocating places. Do not assume that the email retry job releases expired offers—it handles email delivery only.

CSV exports contain applicant information. Share them only with the staff who need them and remove working copies according to the chapter’s retention practices.

## Understand email delivery

There are two paths:

- **Application notifications:** Recorded in `application_email_queue`, with atomic delivery claims, bounded retries, and status in the admin review.
- **Password resets:** Sent by `request-password-reset`; they use request quotas and are not processed by the application email retry job.

| Queue status | Meaning | Maintainer action |
| --- | --- | --- |
| `pending` | Waiting for a delivery attempt | Allow the immediate sender/worker to run; inspect scheduling if it remains stuck |
| `processing` | A worker currently holds a delivery lease | Avoid concurrent manual intervention; inspect an unusually long-running attempt |
| `sent` | Accepted or acknowledged by the email provider | Check Brevo for actual inbox delivery or bounce status |
| `failed` | Explicit failure was recorded | Automatic retries stop after five attempts; inspect the cause before manual retry |
| `uncertain` | The system cannot establish whether delivery was accepted | Check Brevo before retrying to avoid duplicate email |
| `cancelled` | Notification became obsolete | Review the application’s current state; do not force an obsolete notification through |

The worker runs every minute and handles at most five due messages per run. A successful HTTP response means the worker completed its request; inspect individual queue statuses to know which messages succeeded.

For a failed email, open its application review, inspect **Email delivery**, check Brevo and function logs, correct the underlying problem, and use **Retry email** only when appropriate. For `uncertain`, verify provider acceptance first. Do not manually change a row to `sent` to hide an error.

### Read-only health checks

Run these in the intended project’s SQL editor. They return operational status without listing applicant responses or secret values.

```sql
select status, count(*)
from public.application_email_queue
group by status;

select jobid, jobname, schedule, active
from cron.job
where jobname = 'gdg-application-email-retries';

select r.status, r.return_message, r.start_time
from cron.job_run_details r
join cron.job j on j.jobid = r.jobid
where j.jobname = 'gdg-application-email-retries'
order by r.start_time desc
limit 5;
```

Cron success confirms its SQL ran; it does not by itself confirm the HTTP call or an email’s delivery. Check the function logs and queue too. Never print Vault’s decrypted worker secret while investigating.

## Troubleshoot account recovery

### Expected behavior

| Starting point | Expected result |
| --- | --- |
| Signed in → Profile → Reset password | `/dashboard/profile/password`; confirm current password; save; return to profile; other sessions are signed out |
| Signed out → Forgot password | Generic confirmation while eligible; a registered account receives a unique recovery link |
| Valid recovery email link | Verified callback → `/reset-password`; after saving, sign out and redirect to login |
| Direct `/reset-password` visit without recovery proof | An unavailable/expired-link message and a new-link option |
| Fourth reset request for an email within its hourly window | A quota error, not a message promising another email |
| Unconfirmed account attempts login | Redirect to the existing OTP page; no extra confirmation button |

Limits are **three requests per email per one-hour window** and **500 shared provider reservations per hour**. Unknown addresses get the same per-email quota behavior, but do not reserve shared provider quota or generate email. There is no separate 60-second cooldown.

After email-link verification, the website creates a signed, HttpOnly recovery authorization lasting 15 minutes and tied to that user/session. This is separate from the email token’s validity, which is controlled by Supabase Auth. Opening a fresh link and then switching browsers will not transfer the website’s recovery cookie.

### Common problems

| Symptom | Check |
| --- | --- |
| No reset email | Quota response, function logs, sender/template configuration, Brevo acceptance/bounce, and spam folder; a generic success does not prove an account exists |
| A fresh email link fails at the callback | Auth redirect settings, matching site origins, token expiry/reuse, and whether `PASSWORD_RECOVERY_SECRET` is configured in the deployed Next.js environment |
| Recovery page says unavailable after waiting | The 15-minute website authorization may have expired; request a new link |
| Current-password change fails | Current credentials, password rules, same-password rejection, and session validity |
| Password saved but session warning appears | Session revocation failed after the update; do not assume the password update also failed |

Password reset quota records store hashed keys, counts, and window times—not passwords or reset links. Do not clear production counters merely to bypass normal limits during development.

### Complete a real recovery test

Use a designated account and an inbox you control. The account owner should enter the new password.

1. Request a reset; confirm the email arrives and points to the intended website.
2. Open the link, choose a different valid password, and submit.
3. Confirm the redirect to login, rejection of the old password, and successful login with the new password.
4. Confirm the used email link cannot authorize another reset. Test expired-link behavior separately.
5. Separately change the password while signed in and verify the return to the profile.
6. Verify the quota alert without sending requests to real applicants.

Record results and any remaining gaps. Unit/database tests and an empty-queue worker check do not establish that this complete production journey passed.

## Find and investigate failures

| Question | First place to look |
| --- | --- |
| Did the website fail to build? | GitHub Actions and the Vercel build log |
| Did a page/server action fail? | Vercel runtime logs |
| Did authentication or a database operation fail? | Supabase Auth/database logs and the relevant application log |
| Did a function fail? | Supabase Edge Function logs |
| Was an email delivered or bounced? | Brevo transactional email activity |
| Is an application notification waiting? | Application review → Email delivery; queue and schedule health checks |

These are viewing locations, not proof that automated failure alerts are configured. Log retention depends on the service and plan; investigate promptly and preserve a small, redacted incident record.

Capture the time, environment, page/action, deployment commit, safe error details, and reproduction steps. Check recent changes first. A token, password, raw recovery URL, service key, or applicant response is not suitable incident-report content.

For a compromised credential, rotate the affected credential in its owning service and redeploy/retest dependents. Changing a website environment variable does not rotate a Supabase Vault token or a Brevo key.

## Back up and recover data

Supabase’s managed daily backups/dashboard restore require a paid plan. Free projects can still make private logical exports; Supabase recommends regular exports stored off-site. A repository checkout or application CSV export is not a database backup.

A useful recovery plan covers schema, data, required roles, configuration, functions, templates, and access to secrets through the team’s private secret store. Follow the provider’s documented backup/restore procedure, confirm its coverage of managed Auth/Vault objects, and test a restore into an isolated project before relying on it. Database exports do not include the contents of Storage files.

Keep exports outside the repository with restricted access. Record when a backup was taken and when a restore was last verified. Do not restore over production as a trial run. This guide does not set up an automated backup job.

References: [Supabase backups](https://supabase.com/docs/guides/platform/backups) and [CLI backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

## Hand over to the next maintainers

Before the outgoing team loses access:

- Invite incoming maintainers to the required provider projects and verify they can sign in.
- Record the repository, production branch, domains/DNS, linked Supabase project, Vercel project, Brevo sender/templates, billing owner, and recovery contacts privately.
- Confirm local setup, checks, and a small test deployment work for the new team.
- Review active website staff roles and current application openings, staged decisions, expiring offers, and failed/uncertain email.
- Share the last verified backup/restore result, release notes, known issues, and outstanding manual tests.
- Transfer ownership where needed, then revoke departing staff/provider access and rotate credentials that were personally shared.

Keep this guide aligned with the code. When a workflow, secret, function, or deployment step changes, update its instructions in the same pull request.
