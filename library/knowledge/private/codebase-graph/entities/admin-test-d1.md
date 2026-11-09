---
type: entity
title: 'admin/src/test-d1.ts (node:sqlite D1 stand-in)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/test-d1.ts
language: ts
depends_on:
  - "[[entities/admin-db]]"
used_by: []
last_commit_hash: baf8b7a
tested_by: []
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related: []
sources:
  - admin/src/test-d1.ts:1-68
  - admin/migrations/0001_init.sql
---

# admin/src/test-d1.ts (node:sqlite D1 stand-in)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Test-only D1 stand-in: runs the real migration SQL on an in-memory `node:sqlite` database (`admin/src/test-d1.ts:1`). Imported by every admin `*.test.ts` that touches the DB.

## Signature / Definition

```ts
const MIGRATIONS = ['0001_init.sql'].map(read)
export function testDb(): Db & { sql: DatabaseSync }
export const TEST_KEY: string; export const TEST_ORIGIN = 'https://example.com'
export function addTestSite(db, o?): string
```

## Behavior

- Turns on `PRAGMA foreign_keys` and executes each listed migration (`admin/src/test-d1.ts:6-13`).
- `batch` wraps statements in `BEGIN`/`COMMIT`, `ROLLBACK` on error, mimicking D1's atomic batch (`admin/src/test-d1.ts:24-34`).

## Gotchas

- **Not real D1.** Tests prove SQL on `node:sqlite`; keep to SQL both engines support.
- **New migrations must be listed** in `MIGRATIONS` (`admin/src/test-d1.ts:6`), or tests run against the old schema. Migrations are forward-only: add a new numbered migration (0002_name.sql), never edit `admin/migrations/0001_init.sql` (`admin/migrations/0001_init.sql:1-2`). See [[entities/admin-data-model]].

## Connections

- **depends_on:** [[entities/admin-db]]
- **used_by:** none (no non-test importer)

## Tested by

- No test file imports this module directly.

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/test-d1.ts`).

## Sources

- `admin/src/test-d1.ts:1-68`
- `admin/migrations/0001_init.sql`
