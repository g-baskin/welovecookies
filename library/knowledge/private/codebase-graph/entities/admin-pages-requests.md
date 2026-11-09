---
type: entity
title: 'admin/src/pages/requests.ts (Privacy requests pages)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/pages/requests.ts
language: ts
depends_on:
  - "[[entities/admin-html]]"
  - "[[entities/admin-labels]]"
  - "[[entities/admin-requests]]"
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
  - admin/src/pages/requests.ts:1-91
---

# admin/src/pages/requests.ts (Privacy requests pages)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

`/admin/requests` list (open/closed/all) and `/admin/requests/pr_<16>` detail with status, private note and delete.

## Signature / Definition

```ts
export async function requestsPage(ctx); requestPage(ctx, id, error?); saveRequest(ctx, id)
```

## Behavior

- Filter from `?show=`, default `open` (`admin/src/pages/requests.ts:31-35`).
- No emails are sent; the page says to check regularly (`admin/src/pages/requests.ts:42`).
- Detail page switches `ctx.site` to the request's site (`admin/src/pages/requests.ts:58`).
- Delete requires the `confirm=yes` checkbox (`admin/src/pages/requests.ts:83-87`); status must be valid (`admin/src/pages/requests.ts:88`).

## Connections

- **depends_on:** [[entities/admin-html]], [[entities/admin-labels]], [[entities/admin-requests]], [[entities/admin-pages-layout]]
- **used_by:** [[entities/admin-index]]

## Tested by

- No test file imports this module directly.

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/pages/requests.ts`).

## Sources

- `admin/src/pages/requests.ts:1-91`
