---
type: entity
title: 'admin/src/settings.ts (banner settings and version log)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/settings.ts
language: ts
depends_on:
  - "[[entities/consent-types]]"
  - "[[entities/admin-db]]"
used_by:
  - "[[entities/admin-config]]"
  - "[[entities/admin-requests]]"
  - "[[entities/admin-sites]]"
  - "[[entities/admin-tracking]]"
  - "[[entities/admin-pages-banner]]"
  - "[[entities/admin-pages-sites]]"
last_commit_hash: baf8b7a
tested_by:
  - admin/src/data.test.ts
  - admin/src/review.test.ts
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related: []
sources:
  - admin/src/settings.ts:1-296
---

# admin/src/settings.ts (banner settings and version log)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Per-site banner settings (`sites.settings_json`) and version snapshots (`consent_versions`). Changing wording, the cookie list or the Preferences category raises the revision and snapshots what was shown (`admin/src/settings.ts:1-3`).

## Signature / Definition

```ts
export const EDITABLE_TEXTS, BANNER_LANGUAGES, THEME_FIELDS, INTEGRATIONS
export const safeCssValue = (v: string) => boolean
export interface SiteSettings { enabled; position; floatingButton; preferencesCategory; noticeBanner; theme; texts; cookies; integrations }
export const MAX_COOKIES = 200; DEFAULT_COOKIES; defaultSettings()
export const text = (v, max, min = 0) => string | null
export function parseCookie(v); export function parseSettings(raw): SiteSettings
export const siteSettings = (site) => parseSettings(site.settings_json)
export const askedAgainKey = (s) => string
export const snapshotStmt = (db, key, s, now, rev?) => Stmt
export async function saveSettings(db, site, next, opts?): Promise<{ bumped }>
export async function listVersions(db, key)   // latest 50
```

## Behavior

- Owner-editable wording: 8 keys, per language or `*` (`admin/src/settings.ts:15-48`). Language list has 20 codes plus `*` (`admin/src/settings.ts:39-47`).
- `safeCssValue` blocks `; { } < > \ " ' \` @` and `url(`/`image(`/`image-set(`/`element(`/`src(` (`admin/src/settings.ts:61-64`).
- Defaults: banner on, `position: 'auto'`, floating button on, Preferences category off, opt-out notice on, script blocking and known-tracker holding on, other integrations off, one `wlc_consent` cookie row (`admin/src/settings.ts:91-121`).
- `parseSettings` never throws: invalid parts fall back to defaults (`admin/src/settings.ts:167-222`).
- `askedAgainKey` covers texts, cookies minus `label`, and `preferencesCategory` (`admin/src/settings.ts:227-235`).
- `saveSettings`: if not bumped, a single UPDATE; if bumped, one `db.batch` of snapshot(prev at old rev) + UPDATE `rev = rev + 1` + snapshot(new) (`admin/src/settings.ts:255-279`). Snapshots use `ON CONFLICT DO NOTHING`, keeping an existing one (`admin/src/settings.ts:238-249`).

## Connections

- **depends_on:** [[entities/consent-types]], [[entities/admin-db]]
- **used_by:** [[entities/admin-config]], [[entities/admin-requests]], [[entities/admin-sites]], [[entities/admin-tracking]], [[entities/admin-pages-banner]], [[entities/admin-pages-sites]]

## Tested by

- `admin/src/data.test.ts`
- `admin/src/review.test.ts`

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/settings.ts`).

## Sources

- `admin/src/settings.ts:1-296`
