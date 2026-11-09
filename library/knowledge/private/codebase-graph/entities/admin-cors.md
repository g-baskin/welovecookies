---
type: entity
title: 'admin/src/cors.ts (exact-origin CORS)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/cors.ts
language: ts
depends_on:
  - "[[entities/admin-db]]"
used_by:
  - "[[entities/admin-config]]"
  - "[[entities/admin-record]]"
last_commit_hash: baf8b7a
tested_by:
  - admin/src/cors.test.ts
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related:
  - "[[concepts/admin-request-security]]"
sources:
  - admin/src/cors.ts:1-26
---

# admin/src/cors.ts (exact-origin CORS)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Cross-origin rules for banner endpoints: one exact origin per site, never credentials (`admin/src/cors.ts:1`). See [[concepts/admin-request-security]].

## Signature / Definition

```ts
export const corsHeaders: (origin: string) => Record<string, string>; // allow-origin + vary: Origin
export const preflightHeaders: (origin: string, methods: string) => Record<string, string>; // + allow-methods, allow-headers: content-type, max-age 86400
export async function siteForRequest(db: Db, key: unknown, origin: string | null): Promise<{ ok: true; site: SiteRow } | { ok: false; status: 403 | 404 }>
```

## Behavior

- No `access-control-allow-credentials` header is ever set (`admin/src/cors.ts:4-14`).
- `siteForRequest`: missing or disabled site -> 404; `Origin` absent or not byte-equal to `sites.origin` -> 403 (`admin/src/cors.ts:17-26`).

## Connections

- **depends_on:** [[entities/admin-db]]
- **used_by:** [[entities/admin-config]], [[entities/admin-record]]
- **related concepts:** [[concepts/admin-request-security]]

## Tested by

- `admin/src/cors.test.ts`

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/cors.ts`).

## Sources

- `admin/src/cors.ts:1-26`
