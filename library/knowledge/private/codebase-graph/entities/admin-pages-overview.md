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
tested_by:
  - admin/src/index.test.ts
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related: []
sources:
  - admin/src/pages/overview.ts:1-53
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

- Period from `?days=` limited to 7/30/90, default 30 (`admin/src/pages/overview.ts:9`, `admin/src/pages/overview.ts:19`).
- Loads `overview`, `requestCounts` and `latestCheck` in parallel (`admin/src/pages/overview.ts:20-24`).
- Shows a red alert when a connected website's latest check (or, with none, its creation) is older than `DAILY_STALE_DAYS`: only the daily job checks every connected site, so this means it stopped. A manual "Check now" also resets it (`admin/src/pages/overview.ts:26-28`, `admin/src/pages/overview.ts:35`).
- Rates are of `answered`; GPC count and withdrawals shown separately (`admin/src/pages/overview.ts:37-44`).

## Connections

- **depends_on:** [[entities/admin-html]], [[entities/admin-labels]], [[entities/admin-log]], [[entities/admin-requests]], [[entities/admin-tracking]], [[entities/admin-pages-layout]]
- **used_by:** [[entities/admin-index]]

## Tested by

- `admin/src/index.test.ts` (through the router: the stale daily-job warning)

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/pages/overview.ts`).

## Sources

- `admin/src/pages/overview.ts:1-53`
