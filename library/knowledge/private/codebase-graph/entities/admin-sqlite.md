---
type: entity
title: 'admin/src/sqlite.ts (node:sqlite Db, migrations, backups)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/sqlite.ts
language: ts
depends_on:
  - "[[entities/admin-db]]"
  - "[[entities/admin-data-model]]"
used_by:
  - "[[entities/admin-node]]"
  - "[[entities/admin-test-d1]]"
last_commit_hash: uncommitted
tested_by:
  - admin/src/sqlite.test.ts
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related:
  - "[[entities/admin-node]]"
sources:
  - admin/src/sqlite.ts:1-120
---

# admin/src/sqlite.ts (node:sqlite Db, migrations, backups)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

The `Db` interface ([[entities/admin-db]]) on `node:sqlite`, plus the migration runner and backup used by the self-hosted admin ([[entities/admin-node]], ADR 0008) and by the tests ([[entities/admin-test-d1]]), so both run the same database code (`admin/src/sqlite.ts:1`).

## Signature / Definition

```ts
export type SqliteDb = Db & { sql: DatabaseSync; path: string; close(): void }
export const MIGRATIONS_DIR: string // admin/migrations
export function openSqlite(path: string): SqliteDb
export function backupTo(db: SqliteDb, target: string): void
export function migrate(db: SqliteDb, dir?: string): { applied: string[]; backup: string | null }
```

## Behavior

- `openSqlite` sets WAL, `busy_timeout = 5000` and `foreign_keys = ON` per connection (`admin/src/sqlite.ts:14-19`). `batch` runs the statements synchronously inside `BEGIN IMMEDIATE` … `COMMIT`, `ROLLBACK` on error, like D1's atomic batch (`admin/src/sqlite.ts:31-42`).
- `MIGRATIONS_DIR` resolves to `admin/migrations` from both `admin/src/` and the bundle in `admin/node-dist/` (`admin/src/sqlite.ts:10-11`).
- `backupTo` refuses an existing target, writes `VACUUM INTO`, then opens the copy read-only and requires `PRAGMA quick_check` = `ok` (`admin/src/sqlite.ts:48-57`).
- `migrate` lists `NNNN_name.sql` files in name order and tracks applied names in `wlc_migrations` (`admin/src/sqlite.ts:66-100`). It refuses a file with other tables but no history (`admin/src/sqlite.ts:76-79`) and a file holding migrations this version doesn't know (`admin/src/sqlite.ts:86-89`). Before applying pending migrations to a file that already has some, it backs up to `<file>.pre-<first pending>.bak` (a timestamp is added if that exists) (`admin/src/sqlite.ts:93-98`). Each migration and its history row commit in one transaction; a failure rolls back and throws with the name (`admin/src/sqlite.ts:102-117`).

## Gotchas

- **Forward-only.** New schema changes are new files in `admin/migrations/`; they are picked up automatically (no list to update). Keep to SQL that both D1 and SQLite run. See [[entities/admin-data-model]].
- `:memory:` databases are never backed up (tests).
- One writing process per file: the self-hosted admin documents "run one copy".

## Connections

- **depends_on:** [[entities/admin-db]], [[entities/admin-data-model]]
- **used_by:** [[entities/admin-node]], [[entities/admin-test-d1]]

## Tested by

- `admin/src/sqlite.test.ts`: pragmas, batch rollback, first run, backup before a new migration, rollback of a failing one, refusing foreign and newer files, `backupTo`.

## History

- **Last touched:** not yet committed (feature/self-hosted-admin).

## Sources

- `admin/src/sqlite.ts:1-120`
