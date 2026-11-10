---
type: entity
title: 'tools/build-consent.mjs (npm run build)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: tools/build-consent.mjs
language: js
depends_on: []
used_by: []
last_commit_hash: ebe465d
tested_by:
  - src/lib/consent/dist.test.ts
tags:
  - entity
  - tooling
  - hand-authored
  - partial_scan
related: []
sources:
  - tools/build-consent.mjs:1-96
  - package.json:15
---

# tools/build-consent.mjs (npm run build)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Builds the one-tag script and ESM module with esbuild, copies the script for the admin and WordPress plugin, and zips the plugin. Run as `npm run build` (`package.json:15`).

## Behavior

- Optional output dir arg builds only the two scripts there (used by `src/lib/consent/dist.test.ts` to compare with `dist/`) (`tools/build-consent.mjs:19-20`, `tools/build-consent.mjs:46`).
- Both bundles: `--minify --target=es2019 --legal-comments=none` plus the AGPL licence banner (`tools/build-consent.mjs:21-30`). IIFE from [[entities/consent-standalone]] -> `dist/welovecookies.min.js`; ESM from [[entities/consent-index]] -> `dist/welovecookies.mjs` (`tools/build-consent.mjs:31-45`).
- Copies the IIFE to `admin/public/` (gitignored, served by the admin Worker) and `wordpress/welovecookies/assets/` (`tools/build-consent.mjs:54-58`).
- Rebuilds `dist/welovecookies-wordpress.zip` reproducibly: copies `wordpress/welovecookies` (minus `.DS_Store`) to a temp folder, sets fixed dates (2026-01-01 UTC) and modes (644/755), and zips the entries in sorted order with `zip -X -@` under `TZ=UTC`, so the same sources give the same bytes on any machine (`tools/build-consent.mjs:59-96`). `npm run test:local` fails if a fresh build changes the committed zip.

## Gotchas

- Needs system `zip` on PATH (`tools/build-consent.mjs:89-94`).
- The licence banner must stay in `dist/` files (ADR 0001).
- `dist/` is committed and served from `main` (ADR 0005): rebuild and commit after any `src/lib/consent/` change.

## Connections

- **depends_on:** none
- **used_by:** none (no non-test importer)

## Tested by

- `src/lib/consent/dist.test.ts`

## History

- **Last touched:** commit `ebe465d` on 2026-11-09 (from `git log -1 -- tools/build-consent.mjs`).

## Sources

- `tools/build-consent.mjs:1-96`
- `package.json:15`
