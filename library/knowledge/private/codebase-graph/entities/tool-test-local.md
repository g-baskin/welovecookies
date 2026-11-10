---
type: entity
title: 'tools/test-local.mjs (npm run test:local)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: tools/test-local.mjs
language: js
depends_on:
  - '[[entities/tool-serve-demo]]'
used_by: []
last_commit_hash: 8ffd2b2
tested_by: []
tags:
  - entity
  - tooling
  - hand-authored
  - partial_scan
related:
  - '[[entities/tool-build-consent]]'
sources:
  - tools/test-local.mjs:1-189
  - package.json:24
---

# tools/test-local.mjs (npm run test:local)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Fresh-install smoke test: copies the current files into a temp folder and runs the full developer flow there, the way a new developer would (`tools/test-local.mjs:1-2`). Run as `npm run test:local` (`package.json:24`). See `docs/TESTING.md`.

## Behavior

- Copies `git ls-files -co --exclude-standard`, so uncommitted and new (not ignored) files are tested without a commit; ignored files such as `admin/.dev.vars` and `node_modules` are not copied (`tools/test-local.mjs:124-138`).
- Steps, stopping at the first failure: `npm ci`, `npm test`, `npm run check`, `npm run lint`, `npm run format:check` (`tools/test-local.mjs:139-143`), then `npm run build` with a SHA-256 check that `dist/welovecookies.min.js` and `dist/welovecookies.mjs` did not change (`tools/test-local.mjs:144-150`).
- Starts the demo on port 4183 via `PORT` and fetches `/demo/` and the script, checking the licence banner (`tools/test-local.mjs:151-163`).
- Starts the test admin with `e2e/start-admin.mjs` on 8788 (throwaway database, test-only password from `e2e/admin-env.mjs`), signs in over HTTP (303 plus session cookie), opens Overview and checks an unknown website gets 404 (`tools/test-local.mjs:164-182`).
- Prints `PASS`/`FAIL` per step; a failing npm step prints the last 6000 characters of its output (`tools/test-local.mjs:20-45`). Always stops the servers (whole process group on macOS/Linux) and deletes the temp folder, also on Ctrl-C or SIGTERM (`tools/test-local.mjs:93-121`, `tools/test-local.mjs:183-189`).

## Gotchas

- Needs network or a warm npm cache for `npm ci`, and the system `zip` binary for the build.
- Refuses to start if 4183 or 8788 already answer, rather than testing someone else's server (`tools/test-local.mjs:84-91`).

## Connections

- **depends_on:** [[entities/tool-serve-demo]] (spawned), `e2e/start-admin.mjs` (spawned)
- **used_by:** none

## Tested by

- It is itself a test; no unit test imports it.

## History

- **Last touched:** new in 1.1.0 (base commit `8ffd2b2`).

## Sources

- `tools/test-local.mjs:1-189`
- `package.json:24`
