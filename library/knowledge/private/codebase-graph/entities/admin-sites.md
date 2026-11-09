---
type: entity
title: 'admin/src/sites.ts (connected websites)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/sites.ts
language: ts
depends_on:
  - "[[entities/admin-db]]"
  - "[[entities/admin-settings]]"
used_by:
  - "[[entities/admin-pages-sites]]"
last_commit_hash: baf8b7a
tested_by:
  - admin/src/data.test.ts
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related:
  - "[[concepts/hosted-install-flow]]"
sources:
  - admin/src/sites.ts:1-101
---

# admin/src/sites.ts (connected websites)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Site keys, address rules and the install snippet. Websites are switched off, never deleted, so records stay for the retention period (`admin/src/sites.ts:1-2`).

## Signature / Definition

```ts
export function newSiteKey(): string            // 'ws_' + 12 url-safe chars
export function normaliseWebsite(raw): string | null
export function parsePrivacyUrl(raw): string | null   // '' or https URL
export function parseSiteForm(f)
export async function createSite(db, v, now?)
export async function updateSite(db, key, v, now?)
export async function listSitesWithCounts(db, now?)    // + records30
export const snippet = (workerOrigin, key) => '<script src=".../welovecookies.min.js" data-site="KEY" async></script>'
```

## Behavior

- Key: 12 random bytes mapped onto 64 symbols, no modulo bias (`admin/src/sites.ts:8-13`).
- `normaliseWebsite` strips to origin, rejects paths/query/hash/credentials, forces `https://` except `localhost`/`127.0.0.1` (`admin/src/sites.ts:17-36`).
- `createSite` refuses a duplicate origin, then inserts the site and its rev-1 snapshot in one `db.batch` (`admin/src/sites.ts:67-79`).
- `snippet` is the hosted-install tag (`admin/src/sites.ts:100-101`); see [[concepts/hosted-install-flow]].

## Connections

- **depends_on:** [[entities/admin-db]], [[entities/admin-settings]]
- **used_by:** [[entities/admin-pages-sites]]
- **related concepts:** [[concepts/hosted-install-flow]]

## Tested by

- `admin/src/data.test.ts`

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/sites.ts`).

## Sources

- `admin/src/sites.ts:1-101`
