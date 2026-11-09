---
type: entity
title: 'admin/src/pages/banner.ts (Banner and Cookies pages)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/pages/banner.ts
language: ts
depends_on:
  - "[[entities/consent-types]]"
  - "[[entities/admin-html]]"
  - "[[entities/admin-labels]]"
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
  - admin/src/pages/banner.ts:1-207
---

# admin/src/pages/banner.ts (Banner and Cookies pages)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

`/admin/banner` and `/admin/cookies`: edit banner settings, wording per language, theme, integrations, the cookie list, and view version snapshots.

## Signature / Definition

```ts
export async function bannerPage(ctx, error?); export async function saveBanner(ctx)
export function cookiesPage(ctx, error?); export async function saveCookies(ctx)
```

## Behavior

- Shows the current revision and the latest snapshots table (`admin/src/pages/banner.ts:41`, `admin/src/pages/banner.ts:70-85`).
- `ask_again` action raises the revision without changes (`admin/src/pages/banner.ts:96-99`).
- Wording over its max, or an unsafe theme value (`safeCssValue`), re-renders with an error (`admin/src/pages/banner.ts:101-116`). Empty wording for a language deletes its override (`admin/src/pages/banner.ts:117-119`).
- Redirects with `ok=asked` when the save bumped the revision, else `ok=saved` (`admin/src/pages/banner.ts:135-138`).
- Cookies: a hidden `count` guards against edits from another tab (`admin/src/pages/banner.ts:180-181`); max `MAX_COOKIES` (`admin/src/pages/banner.ts:200-201`).

## Connections

- **depends_on:** [[entities/consent-types]], [[entities/admin-html]], [[entities/admin-labels]], [[entities/admin-settings]], [[entities/admin-pages-layout]]
- **used_by:** [[entities/admin-index]]

## Tested by

- No test file imports this module directly.

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/pages/banner.ts`).

## Sources

- `admin/src/pages/banner.ts:1-207`
