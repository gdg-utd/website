# Browser tests

The suite exercises the real production Next.js application through Playwright. Sixteen critical flows run on desktop Chromium and mobile Chromium (Pixel 7 emulation), giving 32 checks per complete run.

## Run locally

Use Node.js 22 and install the repository dependencies and Chromium:

```bash
npm ci
npx playwright install chromium
npm run test:browser
```

On Linux, install browser system dependencies with `npx playwright install --with-deps chromium` if needed.

`test:browser` creates a production Webpack build with synthetic configuration, starts the local test services, runs Playwright, and shuts down those services. It uses the normal `.next` build directory; rebuild normally before using a different environment for a manual production-server session.

The test website uses `http://localhost:3100`; the service double listens on `127.0.0.1:4319`. These ports must be free. Existing servers are never silently reused.

For a targeted run:

```bash
npm run test:browser -- --project=mobile-chromium
npm run test:browser -- --grep "application draft"
```

To check only the production build:

```bash
npm run build:check
```

This uses synthetic public configuration, not production secrets. Once that build is available, `npx playwright test` runs the tests without rebuilding. Prefer `npm run test:browser` when unsure whether the existing build matches the test configuration.

## Coverage

| Flow | What is checked |
| --- | --- |
| Public pages | SPRINT renders, mobile navigation opens/closes, gallery images load and animate, security headers exist, and the page does not overflow horizontally |
| Protected routes | Signed-out access redirects to login; external return URLs stay on the website |
| Login | Incorrect credentials show an error; unconfirmed accounts return to OTP |
| Signup | Password mismatch blocks submission; valid input reaches email verification |
| Reset quotas | The fourth reset request shows the quota warning rather than the success message |
| Profile save | Edited values persist after reload; logout protects the dashboard again |
| Save failure | An unsuccessful profile update preserves entered values |
| Signed-in password change | Incorrect current password is rejected; a successful change returns to the profile |
| Email recovery | Direct access lacks proof; a simulated verified link authorizes the form; saving returns to login; old/new-password behavior is checked; ordinary login does not retain recovery access |
| Application submission | Draft save/resume, required choices/agreements, cancel/confirm dialog, submission success, and submitted-form lock |
| RSVP | Confirmation remains disabled until agreements are checked; a recorded response appears |
| Member restrictions | Members cannot enter the staff portal or read its review API |
| Staff pagination | Next page and search change the visible rows; mobile page width stays within the viewport |
| Expired recovery | Invalid/expired link response returns to requesting a new link |
| Admin review and publishing | Submitted answers and provider status appear; publishing requires a staged decision; cancelling keeps the decision unpublished; confirming publishes it |
| Reviewer restrictions | Reviewers can inspect submissions but cannot access CSV export or publishing controls |

Every test also fails on unexpected browser exceptions and unexpected service endpoint calls. There are no automatic retries that could hide a flaky first attempt. The shared in-memory fixture is reset before each test, so the suite intentionally uses one worker.

## Isolation and limits

Application components, routing, authentication cookie handling, server actions, client validation, and browser rendering are real. Supabase Auth/REST/RPC and email-function responses are supplied by a **local HTTP service double** in `tests/browser/supabase.cjs`. Test users, passwords, applications, and email results are synthetic.

The test environment fixes service URLs to loopback and substitutes a non-production recovery secret. The test server intercepts public chapter-feed fetches with a deterministic fixture and blocks other external `fetch` destinations. Browser requests to external hosts are blocked too. The production build may download its Google fonts; the interactive flows do not call production Supabase or send real email. No test-only route or authentication bypass is added to the application.

The service double is not a Supabase implementation. These tests do **not** prove database RLS, SQL constraints, hosted token expiry/single-use behavior, real session revocation, Brevo delivery, or Cron execution. Keep `npm run test:database` and the unit regressions, and perform the designated real-account recovery/email checks before relying on a production release. Mobile Chromium emulation is not Safari/iOS coverage.

## CI and failure reports

[Website checks](../.github/workflows/checks.yml) runs on pushes and pull requests. It runs the existing code/database checks, performs the production build, installs Chromium and its Linux dependencies, then runs both browser projects. It requires no production credentials.

Open the workflow run in GitHub Actions and download **browser-test-report**. Reports are retained for seven days. Failed cases include screenshots, video, and a trace; successful cases do not retain those recordings.

Locally, open the HTML report with:

```bash
npm run test:browser:report
```

To inspect a failure trace, use `npx playwright show-trace` followed by the trace ZIP path printed by the runner. Reports and results are ignored by Git and ESLint.

## Add or change a test

- Put browser cases in `tests/browser/critical-flows.spec.ts`; prefer accessible labels and roles matching the actual interface.
- For native disclosure menus, locate their `summary` element. Scope application alerts to `main` so they do not match Next.js’s separate route announcer.
- Change the service double only when the real app needs a corresponding request/response contract. Unexpected endpoints must keep failing instead of receiving a generic success.
- Keep database behavior assertions in the database suite; a simulated API response does not validate a database rule.
- Assert a visible result or persisted state after actions. Avoid fixed sleeps and tests that only visit a URL.
- Keep the test configuration loopback-only. Do not add production credentials or switch the suite to the live website.

The harness is configured in [playwright.config.ts](../playwright.config.ts). [Playwright’s CI guide](https://playwright.dev/docs/ci-intro) explains reports and traces; [Next.js’s Playwright guide](https://nextjs.org/docs/app/guides/testing/playwright) explains testing a production build.
