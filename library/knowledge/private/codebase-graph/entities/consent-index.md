---
type: entity
title: "index.ts (ESM API)"
entity_type: module
status: seed
created: "2026-11-09"
updated: "2026-11-09"
path: "src/lib/consent/index.ts"
language: ts
depends_on:
  - "[[entities/consent-types]]"
  - "[[entities/consent-regions]]"
  - "[[entities/consent-cookie]]"
  - "[[entities/consent-i18n]]"
  - "[[entities/consent-device]]"
  - "[[entities/consent-signals]]"
  - "[[entities/consent-manager]]"
used_by: []
last_commit_hash: "888ca73"
tested_by:
  - "src/lib/consent/dist.test.ts"
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related: []
sources:
  - "src/lib/consent/index.ts:1-19"
---
# index.ts (ESM API)

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Overview

The public ESM barrel, built into `dist/welovecookies.mjs` (`tools/build-consent.mjs:31`). It re-exports all of `types`, `regions` and `cookie` (`src/lib/consent/index.ts:1-3`), plus picked symbols from `i18n`, `device`, `signals` and `consent` (`src/lib/consent/index.ts:4-19`).

## Notes

- Not exported: `ui`, `autoclear`, `wiretap`, `auto-hide` and `standalone`. Buyers who want `wiretap` must import its source directly.
- Because `regions` is re-exported, `modeFor` is part of the ESM API for server use.

## Connections

- **depends_on:** [[entities/consent-types]], [[entities/consent-regions]], [[entities/consent-cookie]], [[entities/consent-i18n]], [[entities/consent-device]], [[entities/consent-signals]], [[entities/consent-manager]]
- **used_by:** build entry point only

## Tested by

- `src/lib/consent/dist.test.ts`

## History

- **Created:** commit `888ca73` (2026-11-09) "Add We Love Cookies: location-aware cookie consent"
