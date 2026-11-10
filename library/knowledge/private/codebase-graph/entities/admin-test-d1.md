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
  - "[[entities/admin-sqlite]]"
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
  - admin/src/test-d1.ts:1-40
  - admin/migrations/0001_init.sql
---

# admin/src/test-d1.ts (node:sqlite D1 stand-in)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Test-only D1 stand-in: runs the real migrations on an in-memory `node:sqlite` database through [[entities/admin-sqlite]], the same code the self-hosted admin uses (`admin/src/test-d1.ts:1-8`). Imported by every admin `*.test.ts` that touches the DB.

## Signature / Definition

```ts
export function testDb(): SqliteDb // openSqlite(':memory:') + migrate()
export const TEST_KEY: string; export const TEST_ORIGIN = 'https://example.com'
export function addTestSite(db, o?): string
```

## Behavior

- `testDb` opens `:memory:` with `openSqlite` (foreign keys on, atomic `batch`) and runs `migrate()` over every file in `admin/migrations/` (`admin/src/test-d1.ts:4-8`).
- `addTestSite` inserts a site row straight through `db.sql` (`admin/src/test-d1.ts:13-40`).

## Gotchas

- **Not real D1.** Tests prove SQL on `node:sqlite`; keep to SQL both engines support.
- **New migrations are picked up automatically** by `migrate()`; no list to update. Migrations are forward-only: add a new numbered migration (0002_name.sql), never edit `admin/migrations/0001_init.sql` (`admin/migrations/0001_init.sql:1-2`). See [[entities/admin-data-model]].

## Connections

- **depends_on:** [[entities/admin-db]], [[entities/admin-sqlite]]
- **used_by:** none (no non-test importer)

## Tested by

- No test file imports this module directly.

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/test-d1.ts`).

## Sources

- `admin/src/test-d1.ts:1-40`
- `admin/migrations/0001_init.sql`
