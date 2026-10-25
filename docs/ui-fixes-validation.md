# Audit fixes and validation — October 24, 2026

Follow-up backend/password implementation is documented in [backend-fixes-validation.md](./backend-fixes-validation.md). Its production deployment remains pending approval.

These changes are implemented in the repository and verified locally. They have not been deployed to gdgutd.com. The local site uses the existing Supabase test account and database. Validation did not publish decisions, submit a valid application, send confirmation/reset emails, or change a password.

## Fixed

| Finding | Change |
| --- | --- |
| F01 | Next.js and eslint-config-next upgraded from 16.3.8 to 16.4.3. The vulnerable transitive development dependency Zod was also updated. Full and production-only dependency audits report zero vulnerabilities. |
| F02 | Shared redirect validation rejects control characters, backslashes, external destinations, and paths that normalize to a protocol-relative destination. Applied to login, signup, confirmation, callback, onboarding, and session redirects. |
| F07 | Public navigation switches to its menu layout before the header clips at 1024px. Other page layout breakpoints remain unchanged. |
| F08 | Account navigation columns fit small screens; sidebar minimum sizing and the Applications heading no longer widen the document at 320px. |
| F09 | The admin table's hidden heading is contained inside its positioned scrolling wrapper. Wide table contents scroll inside the table instead of widening the page. |
| F10 | Staff have a mobile Application portal link below account navigation. |
| F11 | The review drawer uses a native modal dialog, initial focus, background inertness, keyboard containment, Escape dismissal, scroll locking, and focus restoration. Focus is retained when loading content is replaced. |
| F12 | Login/signup retain non-password identity fields on failure. Profile and application actions return errors with submitted field values, preserving text, program selections, multiple choices, and agreements. Form errors receive focus and identify invalid application fields. |
| F13 | Required multiple-choice groups require at least one choice before opening final confirmation, with native validation feedback. Saving an incomplete draft remains possible. |
| F14 | Page query values are normalized before string operations. Repeated next/search parameters no longer crash the page. |
| F17 | Failed reads show an explicit error and reload link rather than legitimate empty lists. Covered application choices, saved applications, form data, profile data, and the staff portal. Failures are logged without submitted response bodies. |
| F20 | Light gray labels and account helper text use darker colors, including profile, onboarding, dashboard, and admin review metadata. |
| F21 | The recovery query flag opens neutral password guidance without claiming a verified reset link. |
| F22 | Invalid confirmation links display an explanation on login. Login with an unconfirmed account redirects directly to the existing OTP page. No extra confirmation button or link appears on login. |
| F23 | Failed event feeds display an unavailable-calendar message and the official calendar link. Expired fallback events were removed. Live events with invalid/past dates are excluded; requests time out and failures are logged. |
| F24 | Signup and password reset share an 8–128 character rule, with the signup input maximum and server validation aligned. |
| F25 | Added persistent regression tests and a GitHub Actions workflow for lint, tests, route type generation, and TypeScript. This is a regression baseline, not a complete automated browser suite. |
| F26 | Added a keyboard-visible Skip to main content link and focusable content destinations across pages, including the custom 404. |

F01 advisory: [Next.js Server Actions denial of service](https://github.com/advisories/GHSA-p3m5-59mp-jv5r). The patched 16.x range starts at 16.4.1; this repository now uses 16.4.3.

## Partially fixed

- **F15:** Staff notices now accurately say that undelivered emails need administrator attention and that automatic retries are not configured. The retry worker and delivery-management controls are still outstanding.

## Still outstanding

| Finding | Remaining work |
| --- | --- |
| F03 | Enforce supported degree/major combinations in the database, not just website forms. |
| F04 | Reject NULL agreement confirmation in the RSVP database function. |
| F05 | Add and validate production CSP, frame restrictions, and related security headers. |
| F06 | Enable Supabase leaked-password protection. |
| F15 | Implement email retry processing and staff delivery/retry controls. |
| F16 | Allow a new decision notification after reopening and republishing the same decision. |
| F18 | Add database-backed pagination/filtering to staff application/event queries and bounded export processing. |
| F19 | Resolve stored application form-version drift. |
| F27 | Prevent unknown-email reset requests from consuming the shared legitimate-user reset quota. |

SPRINT project showcase cards still need real project content. Gallery pause controls and hover pausing remain removed as requested; continuous motion and the existing reduced-motion treatment are preserved.

## Validation

- `npm run lint`: passed.
- `npm test`: six regression groups passed (redirect attacks and query arrays, preserved form values, required choices/agreements, password boundaries, unavailable event feeds, and unconfirmed-login redirects).
- `npx tsc --noEmit`: passed.
- `npm run build -- --webpack`: production build passed on Next.js 16.4.3.
- `npm audit` and `npm audit --omit=dev`: zero reported vulnerabilities.
- Desktop browser sweep at 1440px: Home, About, Officers, SPRINT, Apply, dashboard, profile, applications, staff portal, and Tech officer form. No document overflow.
- Mobile sweep at 320px: public pages and account/admin pages. The additional Applications heading overflow found during validation was corrected and retested. No document overflow on the affected account/admin routes.
- Mobile checks at 390px: profile, application list, application form, staff portal, SPRINT, signup, and login. No document overflow on the measured routes.
- 1024px public header: menu fits within the viewport.
- Account login: successful on patched framework. Failed login retains the typed email; incorrect password is cleared. Signup name validation preserves the other name and email without creating an account.
- Invalid NetID: server rejects it and preserves unsaved profile values. Valid database profile remains unchanged.
- Application validation: empty required multi-choice group blocks the confirmation dialog and focuses a checkbox with a validation message. Valid selections open confirmation. A deliberately invalid FTP project URL is rejected by server validation and preserves the unsaved name, radio choice, program, technical interests, and agreements. No valid application was submitted.
- Admin review: initial focus on Close; focus stays inside after Tab, Escape closes, and focus returns to Review. Checked loading and loaded states.
- Formerly crashing repeated login/signup next parameters and repeated staff search parameters render successfully. The onboarding control-character redirect case returns safely to the dashboard.
- SPRINT gallery: visible photos load and both tracks remain animated; no pause control or removed caption was added.

Screenshots are saved in the task's `ui-fixes` artifact folder. Reviewed examples include mobile account navigation/applications, mobile review dialog, desktop profile, and the tablet header. A live database outage was not induced; database failure branches were reviewed in code. Event-feed failure was tested with a mocked unavailable response. GitHub Actions has been added but its hosted run has not been observed yet. Viewports emulate responsive browser widths, not physical-device Safari/Chrome behavior.

Login follow-up: the added confirmation link was removed entirely. The `email_not_confirmed` response redirects to the existing OTP page with the email and return path. Regression tests simulate that Auth response and invalid credentials; no live unconfirmed account was created. A browser check confirmed typing a UTD email creates no confirmation link on login.
