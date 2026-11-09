---
type: entity
title: 'admin/src/pages/overview.ts (Overview page)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/pages/overview.ts
language: ts
depends_on:
  - "[[entities/admin-html]]"
  - "[[entities/admin-labels]]"
  - "[[entities/admin-log]]"
  - "[[entities/admin-requests]]"
  - "[[entities/admin-tracking]]"
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
  - admin/src/pages/overview.ts:1-49
---

# admin/src/pages/overview.ts (Overview page)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

`/admin`: banner views and answer rates for 7/30/90 days, split by region group and device, plus privacy-request and tracking-check summaries.

## Signature / Definition

```ts
export async function overviewPage(ctx: Ctx): Promise<Response>
```

## Behavior

- Period from `?days=` limited to 7/30/90, default 30 (`admin/src/pages/overview.ts:8`, `admin/src/pages/overview.ts:18`).
- Loads `overview`, `requestCounts` and `latestCheck` in parallel (`admin/src/pages/overview.ts:19-23`).
- Rates are of `answered`; GPC count and withdrawals shown separately (`admin/src/pages/overview.ts:33-40`).

## Connections

- **depends_on:** [[entities/admin-html]], [[entities/admin-labels]], [[entities/admin-log]], [[entities/admin-requests]], [[entities/admin-tracking]], [[entities/admin-pages-layout]]
- **used_by:** [[entities/admin-index]]

## Tested by

- No test file imports this module directly.

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/pages/overview.ts`).

## Sources

- `admin/src/pages/overview.ts:1-49`
