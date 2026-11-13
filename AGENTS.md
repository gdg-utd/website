<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Verify GitHub Actions

- Before reporting a pushed change as complete, verify every applicable GitHub Actions workflow passed for the exact commit SHA. Use `gh run list --commit <sha>` to find the runs and `gh run watch <run-id> --exit-status` to wait for each result.
- If a check fails, inspect the failed job logs, fix the cause, and verify the replacement commit's runs. Local checks help catch failures before pushing. They do not establish that GitHub Actions passed.
- If the change is local or GitHub Actions is unavailable, state that CI verification is pending and give the specific blocker.
