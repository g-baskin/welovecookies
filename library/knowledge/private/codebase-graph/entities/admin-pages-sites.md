---
type: entity
title: 'admin/src/pages/sites.ts (Websites and Tracking check pages)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/pages/sites.ts
language: ts
depends_on:
  - "[[entities/admin-db]]"
  - "[[entities/admin-html]]"
  - "[[entities/admin-labels]]"
  - "[[entities/admin-sites]]"
  - "[[entities/admin-tracking]]"
  - "[[entities/admin-settings]]"
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
  - admin/src/pages/sites.ts:1-82
---

# admin/src/pages/sites.ts (Websites and Tracking check pages)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

`/admin/sites` (add/update websites, show script tag and form link) and `/admin/tracking` (latest check, "Check now"); also exports the daily `checkAllSites`.

## Signature / Definition

```ts
export async function sitesPage(ctx, error?); saveSite(ctx)
export async function trackingPage(ctx); checkNow(ctx)
export async function checkAllSites(db, now?): Promise<number>
```

## Behavior

- Each site card shows `snippet(ctx.url.origin, key)` and `/privacy/<key>` (`admin/src/pages/sites.ts:20-21`).
- Add uses `parseSiteForm` + `createSite` (`admin/src/pages/sites.ts:40-46`); update can rename, change privacy link and switch on/off; there is no delete (`admin/src/pages/sites.ts:47-54`).
- `checkAllSites` checks enabled sites only (`admin/src/pages/sites.ts:78-81`).

## Connections

- **depends_on:** [[entities/admin-db]], [[entities/admin-html]], [[entities/admin-labels]], [[entities/admin-sites]], [[entities/admin-tracking]], [[entities/admin-settings]], [[entities/admin-pages-layout]]
- **used_by:** [[entities/admin-index]]

## Tested by

- No test file imports this module directly.

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/pages/sites.ts`).

## Sources

- `admin/src/pages/sites.ts:1-82`
