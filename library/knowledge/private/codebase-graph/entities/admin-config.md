---
type: entity
title: 'admin/src/config.ts (GET /api/consent/config)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/config.ts
language: ts
depends_on:
  - "[[entities/consent-regions]]"
  - "[[entities/consent-types]]"
  - "[[entities/admin-cors]]"
  - "[[entities/admin-db]]"
  - "[[entities/admin-html]]"
  - "[[entities/admin-settings]]"
used_by:
  - "[[entities/admin-index]]"
  - "[[entities/admin-privacy]]"
  - "[[entities/admin-record]]"
last_commit_hash: baf8b7a
tested_by:
  - admin/src/public.test.ts
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related:
  - "[[concepts/hosted-install-flow]]"
sources:
  - admin/src/config.ts:1-78
---

# admin/src/config.ts (GET /api/consent/config)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Serves the per-visitor `ConsentConfig` for a hosted install; the region mode comes from Cloudflare's `request.cf`, via `modeFor` from [[entities/consent-regions]]. Missing location = opt-in (ADR 0002) (`admin/src/config.ts:1-3`). See [[concepts/hosted-install-flow]].

## Signature / Definition

```ts
export interface Place { country: string | null; regionCode: string | null }
export function placeOf(request): Place
export const browserGpc = (request) => request.headers.get('sec-gpc') === '1'
export function buildConfig(site, s, place, gpc, workerOrigin): ConsentConfig
export async function handleConfig(request, env): Promise<Response>
export async function handlePreflight(request, env, methods): Promise<Response>
```

## Behavior

- `placeOf` accepts a 2-letter country except `XX`/`T1`, and a 1-3 char region code (`admin/src/config.ts:17-25`).
- `buildConfig` sets mode, place, gpc, `rev`, texts, theme, position, preferences category, floating button, notice banner, cookies, links (privacy policy if set, plus `privacyChoices` -> `/privacy/<key>?kind=stop_selling`), `endpoints.record`/`seen` on the Worker origin, `cookieName`, `cookieDomain: 'auto'`, integrations, `brandName`, `site` (`admin/src/config.ts:29-60`).
- `handleConfig`: unknown/off site -> 404, wrong origin -> 403 (no CORS header); banner setting off -> 404 with CORS so the script falls back to its built-in banner (`admin/src/config.ts:62-71`).
- `handlePreflight`: 204 with preflight headers only for an enabled site's exact origin, else 403 (`admin/src/config.ts:74-78`).

## Connections

- **depends_on:** [[entities/consent-regions]], [[entities/consent-types]], [[entities/admin-cors]], [[entities/admin-db]], [[entities/admin-html]], [[entities/admin-settings]]
- **used_by:** [[entities/admin-index]], [[entities/admin-privacy]], [[entities/admin-record]]
- **related concepts:** [[concepts/hosted-install-flow]]

## Tested by

- `admin/src/public.test.ts`

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/config.ts`).

## Sources

- `admin/src/config.ts:1-78`
