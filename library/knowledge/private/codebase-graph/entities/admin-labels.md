---
type: entity
title: 'admin/src/labels.ts (plain-words labels)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/labels.ts
language: ts
depends_on:
  - "[[entities/consent-regions]]"
  - "[[entities/consent-types]]"
used_by:
  - "[[entities/admin-log]]"
  - "[[entities/admin-tracking]]"
  - "[[entities/admin-pages-banner]]"
  - "[[entities/admin-pages-overview]]"
  - "[[entities/admin-pages-records]]"
  - "[[entities/admin-pages-requests]]"
  - "[[entities/admin-pages-sites]]"
last_commit_hash: baf8b7a
tested_by: []
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related: []
sources:
  - admin/src/labels.ts:1-81
---

# admin/src/labels.ts (plain-words labels)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Display labels for admin pages and the CSV export (`admin/src/labels.ts:1`).

## Signature / Definition

```ts
export const ACTION_LABEL, MODE_LABEL, DEVICE_LABEL, CATEGORY_LABEL: Record<string, string>
export const REGION_GROUPS  // ask | optout | notice
export const groupOf = (mode: string): RegionGroup
export const yesNo; export function placeName(country, region); export function browserName(ua)
export const utc = (ms) => 'YYYY-MM-DD HH:MM'; export const pct = (n, of) => string
```

## Behavior

- `CATEGORY_LABEL.analytics` is shown as "Statistics" (`admin/src/labels.ts:26-31`).
- `groupOf` puts unknown modes and any `MODE_RULES[mode].optIn` mode in `ask`; `notice` in `notice`; the rest in `optout` (`admin/src/labels.ts:51-56`).
- `placeName` uses `Intl.DisplayNames` and falls back to the code (`admin/src/labels.ts:60-69`).
- `pct` returns an en dash when the denominator is 0 (`admin/src/labels.ts:81`).

## Connections

- **depends_on:** [[entities/consent-regions]], [[entities/consent-types]]
- **used_by:** [[entities/admin-log]], [[entities/admin-tracking]], [[entities/admin-pages-banner]], [[entities/admin-pages-overview]], [[entities/admin-pages-records]], [[entities/admin-pages-requests]], [[entities/admin-pages-sites]]

## Tested by

- No test file imports this module directly.

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/labels.ts`).

## Sources

- `admin/src/labels.ts:1-81`
