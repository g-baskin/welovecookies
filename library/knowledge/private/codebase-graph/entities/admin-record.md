---
type: entity
title: 'admin/src/record.ts (POST /api/consent and /api/consent/seen)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/record.ts
language: ts
depends_on:
  - "[[entities/consent-cookie]]"
  - "[[entities/consent-regions]]"
  - "[[entities/consent-types]]"
  - "[[entities/admin-auth]]"
  - "[[entities/admin-config]]"
  - "[[entities/admin-cors]]"
  - "[[entities/admin-db]]"
  - "[[entities/admin-html]]"
used_by:
  - "[[entities/admin-index]]"
last_commit_hash: baf8b7a
tested_by:
  - admin/src/public.test.ts
  - admin/src/review.test.ts
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related:
  - "[[concepts/hosted-install-flow]]"
sources:
  - admin/src/record.ts:1-169
---

# admin/src/record.ts (POST /api/consent and /api/consent/seen)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Receives choices (record endpoint) and banner views (seen endpoint) from connected websites. The server decides region mode and revision; GPC from payload or `Sec-GPC` turns marketing off; no IP stored (`admin/src/record.ts:1-3`). See [[concepts/hosted-install-flow]].

## Signature / Definition

```ts
export const MAX_BODY = 8192
export const METRICS = ['seen','accept_all','reject_all','custom','acknowledge','withdraw','gpc']
export async function readJson(request)
export function parseChoice(b): ChoiceInput | null
export function pathOnly(page, origin): string
export function correctChoice(input, ctx): StoredConsent
export const bumpStmt = (db, site, metric, mode, country, device, now) => Stmt
export async function saveChoice(db, site, input, ctx): Promise<StoredConsent>
export async function handleRecord(request, env, now?); handleSeen(request, env, now?)
```

## Behavior

- `parseChoice` requires a valid action (`isConsentAction`), boolean grants, language tag, device, page <= 500 chars, optional boolean `gpc`; `rev` kept only if integer >= 1 (`admin/src/record.ts:53-69`).
- `pathOnly` keeps the path (<= 200) only when the page is on the site's origin (`admin/src/record.ts:72-79`).
- `correctChoice` keeps a valid client consent id else mints one, uses server mode/rev, forces `marketing: false` under GPC (`admin/src/record.ts:82-94`).
- `saveChoice`: mode from `modeFor(country, regionCode)`; keeps the client revision only if <= site rev (`admin/src/record.ts:109-112`). Inserts the consent record and, unless the UA matches `BOT_RE`, bumps the action counter and a `gpc` counter, all in one `db.batch` (`admin/src/record.ts:114-128`, `admin/src/record.ts:24`).
- `handleRecord`: 404/403 from `siteForRequest`, 400 invalid, 500 on DB error, 200 `{ ok, consent }` with CORS (`admin/src/record.ts:132-151`). The script rewrites its cookie from `consent` (see [[concepts/hosted-install-flow]]).
- `handleSeen`: 400 without a valid device; bumps `seen` unless bot; DB errors logged; 204 (`admin/src/record.ts:153-169`).

## Connections

- **depends_on:** [[entities/consent-cookie]], [[entities/consent-regions]], [[entities/consent-types]], [[entities/admin-auth]], [[entities/admin-config]], [[entities/admin-cors]], [[entities/admin-db]], [[entities/admin-html]]
- **used_by:** [[entities/admin-index]]
- **related concepts:** [[concepts/hosted-install-flow]]

## Tested by

- `admin/src/public.test.ts`
- `admin/src/review.test.ts`

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/record.ts`).

## Sources

- `admin/src/record.ts:1-169`
