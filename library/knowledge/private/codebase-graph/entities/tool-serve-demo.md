---
type: entity
title: 'tools/serve-demo.mjs (npm run demo)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: tools/serve-demo.mjs
language: js
depends_on: []
used_by: []
last_commit_hash: f14f71e
tested_by: []
tags:
  - entity
  - tooling
  - hand-authored
  - partial_scan
related: []
sources:
  - tools/serve-demo.mjs:1-21
  - package.json:17
---

# tools/serve-demo.mjs (npm run demo)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Static server on `127.0.0.1:4173` so `demo/` can load `dist/` over http (cookies need http) (`tools/serve-demo.mjs:1`, `tools/serve-demo.mjs:21`). Run as `npm run demo` (`package.json:17`).

## Behavior

- Serves only paths under the repo containing `/demo/`, `/dist/` or `/docs/assets/`; everything else 404 (`tools/serve-demo.mjs:9-14`).
- Directory paths map to `index.html` (`tools/serve-demo.mjs:10`).

## Gotchas

- Loads `../dist/`, so run `npm run build` first.

## Connections

- **depends_on:** none
- **used_by:** none (no non-test importer)

## Tested by

- No test file imports this module directly.

## History

- **Last touched:** commit `f14f71e` on 2026-11-09 (from `git log -1 -- tools/serve-demo.mjs`).

## Sources

- `tools/serve-demo.mjs:1-21`
- `package.json:17`
