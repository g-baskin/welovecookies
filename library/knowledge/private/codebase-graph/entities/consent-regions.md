---
type: entity
title: "regions.ts"
entity_type: module
status: seed
created: "2026-11-09"
updated: "2026-11-09"
path: "src/lib/consent/regions.ts"
language: ts
depends_on:
  - "[[entities/consent-types]]"
used_by:
  - "[[entities/consent-manager]]"
  - "[[entities/consent-index]]"
  - "[[entities/consent-wiretap]]"
  - "[[entities/admin-record]]"
  - "[[entities/admin-config]]"
  - "[[entities/admin-labels]]"
  - "[[entities/admin-tracking]]"
last_commit_hash: "baf8b7a"
tested_by:
  - "src/lib/consent/contract.test.ts"
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related:
  - "[[concepts/region-mode-resolution]]"
  - "[[concepts/choice-lifecycle]]"
sources:
  - "src/lib/consent/regions.ts:1-83"
  - "src/lib/consent/regions.ts:85-201"
---
# regions.ts

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Overview

This module maps a place to a region mode and defines what each mode does (mode rules) (`src/lib/consent/regions.ts:1-5`). It is the source of truth for the law tables. Where `docs/privacy/consent-law-matrix.md` disagrees, the code wins.

## Signature / Definition

```ts
export const REGIONS_CHECKED = '2026-11-03';
export function modeFor(country, regionCode?, forceOptIn?): ConsentMode;   // server-side only
export const MODE_RULES: Record<ConsentMode, ModeRule>;
export function isCurrent(stored, rev, now?): boolean;
export function effectiveGrants(mode, stored, rev, gpc, now?): Grants;
export function bannerFor(mode, stored, rev, opts?, now?): 'full'|'notice'|null;
export function modeFromTimeZone(tz): ConsentMode;                           // browser 'auto'
```

## Behavior

- **Dated tables:** `REGIONS_CHECKED = '2026-11-03'`, re-checked every 12 months (`src/lib/consent/regions.ts:14-15`). The admin tracking check reads it (`src/lib/consent/contract.test.ts:125`).
- **Country table:** EU/EEA, plus IS/LI/NO, are `opt-in`. GB is `opt-in-uk`. **CH is `opt-in` on purpose**, even though most readings of nFADP allow opt-out (ADR 0003) (`src/lib/consent/regions.ts:17-35`). `CA-QC` is overridden to `opt-in` (`src/lib/consent/regions.ts:38`).
- **US:** 12 states are `opt-out-gpc` and 8 are `opt-out`. Other states and DC are `notice`. A US visitor with no state gets `opt-out-gpc` (`src/lib/consent/regions.ts:40-54`).
- **Unknown:** missing, invalid, `XX` or `T1` codes give `DEFAULT_MODE = 'opt-in'` (ADR 0002) (`src/lib/consent/regions.ts:56-62`).
- **modeFor:** `forceOptIn` wins, then the region override, then US state, then the country table (`src/lib/consent/regions.ts:68-83`). **The banner never calls it.** Only admin (`admin/src/record.ts:5`, `admin/src/config.ts:4`) and buyers' servers use it.
- **MODE_RULES:** the three opt-in modes share one rule: full banner, nothing granted, 180 days. The opt-out modes default to all granted with a notice banner, a Do Not Sell link and 365 days. `notice` has no banner (`src/lib/consent/regions.ts:100-136`).
- **isCurrent:** the choice's rev is at least the current rev and it is younger than its mode's max age, with one day of clock-skew tolerance (`src/lib/consent/regions.ts:140-144`).
- **effectiveGrants / bannerFor:** in an ask-first mode, a choice made under an opt-out mode does not count, so the visitor is asked again. GPC forces marketing off. The notice banner defaults to `{optOut: true, notice: false}` (`src/lib/consent/regions.ts:146-180`).
- **modeFromTimeZone:** London/Belfast → `opt-in-uk`; Europe and some Atlantic zones → `opt-in`; Canadian zones → `opt-out`, except Montreal → `opt-in`; US zones → `opt-out-gpc`; Tokyo, Australia and Auckland → `notice`; anything else → `opt-in` (`src/lib/consent/regions.ts:182-201`).

## Connections

- **depends_on:** [[entities/consent-types]]
- **used_by:** [[entities/consent-manager]], [[entities/consent-index]], [[entities/consent-wiretap]], [[entities/admin-record]], [[entities/admin-config]], [[entities/admin-labels]], [[entities/admin-tracking]]
- **related concepts:** [[concepts/region-mode-resolution]]

## Tested by

- `src/lib/consent/contract.test.ts` (region modes `:40-62`, grants and banner `:64-107`)

## History

- **Created:** commit `888ca73` (2026-11-09) "Add We Love Cookies: location-aware cookie consent"
- **Last touched:** commit `baf8b7a` (2026-11-09) "Add optional admin on Cloudflare (Worker + D1)"
