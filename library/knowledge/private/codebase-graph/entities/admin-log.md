---
type: entity
title: 'admin/src/log.ts (consent log reads, counters, retention purge)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/log.ts
language: ts
depends_on:
  - "[[entities/admin-db]]"
  - "[[entities/admin-labels]]"
used_by:
  - "[[entities/admin-index]]"
  - "[[entities/admin-pages-overview]]"
  - "[[entities/admin-pages-records]]"
last_commit_hash: baf8b7a
tested_by:
  - admin/src/data.test.ts
  - admin/src/index.test.ts
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related: []
sources:
  - admin/src/log.ts:1-186
---

# admin/src/log.ts (consent log reads, counters, retention purge)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Reads `consent_records` and `consent_daily`, and runs the 5-year retention purge (`admin/src/log.ts:1`).

## Signature / Definition

```ts
export const RETENTION_YEARS = 5; RETENTION_MS = 5*365 days + 2 days; CSV_MAX_ROWS = 100_000
export async function recordsForConsentId(db, site, consentId)  // max 200
export async function recentRecords(db, site, limit = 50)
export async function recordsBetween(db, site, from, to)        // up to CSV_MAX_ROWS + 1
export function tally(rows: DailyRow[]): Overview
export async function overview(db, site, days, now?)
export async function purgeOld(db, now?, batch = 5000, maxRounds = 8)
```

## Behavior

- `recordsBetween` returns one extra row so the caller can detect an over-large range (`admin/src/log.ts:53-68`).
- `tally`: `answered` = accept_all + reject_all + custom + acknowledge; `withdraw` and `gpc` counted separately (`admin/src/log.ts:91-107`); groups by region via `groupOf` and by device (`admin/src/log.ts:122-136`).
- `overview` sums `consent_daily` for the last `days` UTC days incl. today (`admin/src/log.ts:138-153`).
- `purgeOld` deletes records older than `RETENTION_MS`, daily counters older than its day, and `rate_events` older than 1 day, in batches of 5000 for up to 8 rounds per table; sets `more` when rounds run out (`admin/src/log.ts:155-186`). Comment: D1 free plan allows 50 queries per run (`admin/src/log.ts:159`).

## Connections

- **depends_on:** [[entities/admin-db]], [[entities/admin-labels]]
- **used_by:** [[entities/admin-index]], [[entities/admin-pages-overview]], [[entities/admin-pages-records]]

## Tested by

- `admin/src/data.test.ts`
- `admin/src/index.test.ts`

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/log.ts`).

## Sources

- `admin/src/log.ts:1-186`
