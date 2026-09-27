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

The current release includes a responsive public homepage, a dedicated SPRINT program experience, locally bundled official GDG assets and unDraw illustrations, live chapter information, community links, SPRINT photography, upcoming events synchronized from the official GDG chapter page, and Supabase-backed member authentication.

The team directory at `/team` remains a placeholder. Authentication is available at `/login` and `/signup`, with a protected member page at `/account`.

Upcoming event data is refreshed hourly. A verified local fallback keeps the page useful when the chapter platform is unavailable. RSVP links always send visitors to the official event page.

The site intentionally makes no claim of affiliation with The University of Texas at Dallas and does not use UTD branding or photography.

See [`ASSETS.md`](./ASSETS.md) for artwork sources and licensing notes.
