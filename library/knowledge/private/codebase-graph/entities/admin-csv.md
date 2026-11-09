---
type: entity
title: 'admin/src/csv.ts (formula-safe CSV)'
entity_type: function
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/csv.ts
language: ts
depends_on: []
used_by:
  - "[[entities/admin-pages-records]]"
last_commit_hash: baf8b7a
tested_by:
  - admin/src/data.test.ts
  - admin/src/review.test.ts
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related: []
sources:
  - admin/src/csv.ts:1-11
---

# admin/src/csv.ts (formula-safe CSV)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

CSV writer for the consent-record export (`admin/src/csv.ts:1`).

## Signature / Definition

```ts
export function csvCell(v: unknown): string
export function toCsv(header: readonly string[], rows: readonly (readonly unknown[])[]): string
```

## Behavior

- Cells starting (after whitespace) with `= + - @ | %` or full-width variants, or with tab/CR, get a leading apostrophe (formula-injection guard) (`admin/src/csv.ts:4`).
- Quotes cells containing `"`, `,`, CR or LF (`admin/src/csv.ts:5`).
- Output has a UTF-8 BOM and CRLF line ends (`admin/src/csv.ts:9-11`).

## Connections

- **depends_on:** none
- **used_by:** [[entities/admin-pages-records]]

## Tested by

- `admin/src/data.test.ts`
- `admin/src/review.test.ts`

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/csv.ts`).

## Sources

- `admin/src/csv.ts:1-11`
