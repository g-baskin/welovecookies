---
type: entity
title: 'admin/src/pages/records.ts (Consent records page and CSV)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/pages/records.ts
language: ts
depends_on:
  - "[[entities/consent-cookie]]"
  - "[[entities/admin-csv]]"
  - "[[entities/admin-db]]"
  - "[[entities/admin-html]]"
  - "[[entities/admin-labels]]"
  - "[[entities/admin-log]]"
  - "[[entities/admin-pages-layout]]"
used_by:
  - "[[entities/admin-index]]"
last_commit_hash: baf8b7a
tested_by: []
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related: []
sources:
  - admin/src/pages/records.ts:1-66
---

# admin/src/pages/records.ts (Consent records page and CSV)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

`/admin/records` (lookup by consent id, latest 50) and `/admin/records.csv` (date-range export).

## Signature / Definition

```ts
export async function recordsPage(ctx: Ctx); export async function recordsCsv(ctx: Ctx): Promise<Response>
```

## Behavior

- Lookup only runs when the id matches `CONSENT_ID_RE` (`admin/src/pages/records.ts:20-21`).
- CSV dates must be real `YYYY-MM-DD` UTC days with from <= to (`admin/src/pages/records.ts:41-46`); more than `CSV_MAX_ROWS` rows -> error asking for a shorter range (`admin/src/pages/records.ts:47-49`).
- 15 columns incl. browser name (from UA) and website name (`admin/src/pages/records.ts:50-57`); served as attachment, `private, no-store`, `nosniff` (`admin/src/pages/records.ts:58-65`).

## Connections

- **depends_on:** [[entities/consent-cookie]], [[entities/admin-csv]], [[entities/admin-db]], [[entities/admin-html]], [[entities/admin-labels]], [[entities/admin-log]], [[entities/admin-pages-layout]]
- **used_by:** [[entities/admin-index]]

## Tested by

- No test file imports this module directly.

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/pages/records.ts`).

## Sources

- `admin/src/pages/records.ts:1-66`
