# GDG UTD Website

Homepage for the independent GDG UTD developer community website.

## Stack

- Next.js 16 with the App Router
- React 19
- TypeScript
- Tailwind CSS 4
- ESLint with the Next.js Core Web Vitals rules
- npm

## Requirements

- Node.js 20.9 or newer
- npm 10 or newer

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

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
public/           Static assets
next.config.ts    Next.js configuration
tsconfig.json     TypeScript configuration
eslint.config.mjs ESLint configuration
```

## Current scope

The current release includes a responsive public homepage, a dedicated SPRINT program experience, locally bundled official GDG assets and unDraw illustrations, live chapter information, community links, event-photo gallery placeholders, and upcoming events synchronized from the official GDG chapter page.

Placeholder routes are available for the future team directory and member authentication at `/team`, `/login`, and `/signup`.

Upcoming event data is refreshed hourly. A verified local fallback keeps the page useful when the chapter platform is unavailable. RSVP links always send visitors to the official event page.

The site intentionally makes no claim of affiliation with The University of Texas at Dallas and does not use UTD branding or photography.

See [`ASSETS.md`](./ASSETS.md) for artwork sources and licensing notes.
