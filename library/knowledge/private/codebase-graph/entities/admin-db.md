---
type: entity
title: 'admin/src/db.ts (D1 subset, Env, SiteRow)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/db.ts
language: ts
depends_on: []
used_by:
  - "[[entities/admin-index]]"
  - "[[entities/admin-auth]]"
  - "[[entities/admin-config]]"
  - "[[entities/admin-cors]]"
  - "[[entities/admin-log]]"
  - "[[entities/admin-privacy]]"
  - "[[entities/admin-record]]"
  - "[[entities/admin-requests]]"
  - "[[entities/admin-settings]]"
  - "[[entities/admin-sites]]"
  - "[[entities/admin-tracking]]"
  - "[[entities/admin-test-d1]]"
  - "[[entities/admin-sqlite]]"
  - "[[entities/admin-node]]"
  - "[[entities/admin-pages-layout]]"
  - "[[entities/admin-pages-login]]"
  - "[[entities/admin-pages-records]]"
  - "[[entities/admin-pages-sites]]"
last_commit_hash: baf8b7a
tested_by:
  - admin/src/cors.test.ts
  - admin/src/data.test.ts
  - admin/src/review.test.ts
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related: []
sources:
  - admin/src/db.ts:1-55
---

# admin/src/db.ts (D1 subset, Env, SiteRow)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

The small part of the D1 API the Worker uses, so tests and the self-hosted admin can run the same SQL on `node:sqlite` via [[entities/admin-sqlite]] (`admin/src/db.ts:1`). Tables: [[entities/admin-data-model]].

## Signature / Definition

```ts
export interface Stmt { bind; first; all; run }
export interface Db { prepare(q): Stmt; batch(statements: Stmt[]): Promise<unknown[]> }
export interface Env { DB: Db; ADMIN_PASSWORD?; SESSION_SECRET?; PUBLIC_LIMITER? }
export const DAY_MS = 86_400_000; export const dayKey = (ms) => ISO date
export interface SiteRow { key; name; origin; privacy_url; enabled; settings_json; rev; created_at; updated_at }
export const SITE_KEY_RE = /^ws_[A-Za-z0-9_-]{12}$/
export async function getSite(db, key); listSiteRows(db); enabledSiteByOrigin(db, origin)
```

## Behavior

- `batch` runs every statement in one transaction; D1 has no BEGIN/COMMIT, so multi-row writes must go through `db.batch()` (`admin/src/db.ts:10-11`).
- `PUBLIC_LIMITER` is the optional Workers rate-limit binding from `admin/wrangler.jsonc` `ratelimits` (`admin/src/db.ts:18-19`; `admin/wrangler.jsonc:20`).
- `getSite` validates the key shape before querying (`admin/src/db.ts:39-42`); `listSiteRows` orders by `created_at, key` (`admin/src/db.ts:44-46`); `enabledSiteByOrigin` is used for preflights, which carry no site key (`admin/src/db.ts:48-55`).

## Connections

- **depends_on:** none
- **used_by:** [[entities/admin-index]], [[entities/admin-auth]], [[entities/admin-config]], [[entities/admin-cors]], [[entities/admin-log]], [[entities/admin-privacy]], [[entities/admin-record]], [[entities/admin-requests]], [[entities/admin-settings]], [[entities/admin-sites]], [[entities/admin-tracking]], [[entities/admin-test-d1]], [[entities/admin-sqlite]], [[entities/admin-node]], [[entities/admin-pages-layout]], [[entities/admin-pages-login]], [[entities/admin-pages-records]], [[entities/admin-pages-sites]]

## Tested by

- `admin/src/cors.test.ts`
- `admin/src/data.test.ts`
- `admin/src/review.test.ts`

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/db.ts`).

## Sources

- `admin/src/db.ts:1-55`
