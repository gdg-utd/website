# GDG UTD Website

Homepage for the independent GDG UTD developer community website.

## Stack

- Next.js 16 with the App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth and Postgres
- ESLint with the Next.js Core Web Vitals rules
- npm

## Requirements

- Node.js 20.9 or newer
- npm 10 or newer

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with the project URL and publishable key from the Supabase project’s Connect dialog. Never place a Supabase secret or service-role key in a `NEXT_PUBLIC_` variable.

Open [http://localhost:3000](http://localhost:3000) in a browser.

## Authentication

Email-and-password authentication uses Supabase SSR with cookie-based sessions. The Next.js proxy refreshes sessions, `/account` is protected, and email confirmations return through `/auth/callback`.

Database changes live in `supabase/migrations`. The profile table has row-level security: members can only read and update their own profile, anonymous visitors have no table access, and a private trigger creates the profile after signup.

## Applications

SPRINT Officer and SPRINT Mentee applications are stored in Supabase. Applicants can save drafts, submit once, and track published decisions from `/dashboard`. Submitted responses are available only to application staff through `/admin/applications`. Reviewers can read applications and stage decisions; administrators can also publish decisions, reopen applications, and export CSV data.

To grant portal access after a staff member has created an account, add their user ID and role to `application_admins` from the Supabase SQL editor:

```sql
insert into public.application_admins (user_id, role)
select id, 'admin' from auth.users where email = 'admin@utdallas.edu';

insert into public.application_admins (user_id, role)
select id, 'reviewer' from auth.users where email = 'reviewer@utdallas.edu';
```

Application notifications are recorded in `application_email_queue` and delivered through the protected `send-application-email` Supabase Edge Function. The Brevo account contains three transactional templates: application received, accepted, and not selected.

Production credentials belong in **Supabase Dashboard → Edge Functions → Secrets**, not in browser-visible Next.js variables. Add these values before testing delivery:

```text
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=...
BREVO_SENDER_NAME=GDG UTDallas
BREVO_REPLY_TO=...
SITE_URL=https://gdgutd.com
```

For local Edge Function testing, copy the same values into an ignored environment file and pass it to `supabase functions serve --env-file ...`. Never prefix the Brevo API key with `NEXT_PUBLIC_` and never commit it.

## Available commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Project structure

```text
src/app/          App Router routes, layouts, and global styles
src/lib/supabase/ Supabase browser, server, and proxy clients
supabase/         Database migrations
public/           Static assets
next.config.ts    Next.js configuration
tsconfig.json     TypeScript configuration
eslint.config.mjs ESLint configuration
```

## Current scope

The current release includes a responsive public homepage, a dedicated SPRINT program experience, locally bundled official GDG assets and SketchValley illustrations, live chapter information, community links, SPRINT photography, upcoming events synchronized from the official GDG chapter page, Supabase-backed member authentication, and a secure applications workflow.

Authentication is available at `/login` and `/signup`. The protected dashboard is at `/dashboard`, and officers are listed at `/officers`.

Upcoming event data is refreshed hourly. A verified local fallback keeps the page useful when the chapter platform is unavailable. RSVP links always send visitors to the official event page.

The site intentionally makes no claim of affiliation with The University of Texas at Dallas and does not use UTD branding or photography.

See [`ASSETS.md`](./ASSETS.md) for artwork sources and licensing notes.
