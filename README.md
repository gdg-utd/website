# GDG UTD Website

Initial application scaffold for the independent GDG UTD website.

This repository currently contains framework and development tooling only. The generated Next.js starter page is intentionally unchanged; homepage design and project-specific UI will be added in a later phase.

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

Only the initial project setup is included. No GDG homepage design, branding, illustrations, event content, or UTD assets have been implemented.
