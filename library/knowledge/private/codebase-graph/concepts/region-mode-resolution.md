---
type: concept
title: "Region mode resolution"
status: seed
created: "2026-11-09"
updated: "2026-11-09"
tags:
  - "concept"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related:
  - "[[entities/consent-regions]]"
  - "[[entities/consent-manager]]"
  - "[[entities/consent-wiretap]]"
sources:
  - "src/lib/consent/regions.ts:14-83"
  - "src/lib/consent/regions.ts:100-201"
  - "src/lib/consent/consent.ts:112-131"
  - "src/lib/consent/types.ts:19-36"
---
# Region mode resolution

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

There are two separate paths to a region mode (`ConsentMode`, `src/lib/consent/types.ts:28-36`).

## Browser: `mode: 'auto'` → time zone only

`createConsent` reads `Intl.DateTimeFormat().resolvedOptions().timeZone` and calls `modeFromTimeZone` (`src/lib/consent/consent.ts:112-119`). **There is no IP or country lookup in the browser.** An unmatched zone gives `opt-in` (`src/lib/consent/regions.ts:182-201`). This is a best guess: a visitor's clock can disagree with their location.

## Server: `modeFor(country, regionCode, forceOptIn)`

Used by admin (`admin/src/config.ts:4`, `admin/src/record.ts:5`) and buyers' servers, never by the banner. The order is: invalid or unknown country → `opt-in`; `forceOptIn` → `opt-in`; region override (`CA-QC`); US state table; country table; default (`src/lib/consent/regions.ts:58-83`). The server then sends a resolved `mode` in the config.

## Deliberate choices

- Unknown places get the strictest behaviour (ADR 0002, `src/lib/consent/regions.ts:56`).
- **CH is `opt-in` on purpose** (ADR 0003, `src/lib/consent/regions.ts:26-27`), even though `docs/privacy/consent-law-matrix.md` treats it as opt-out. `regions.ts` is the source of truth.
- The tables are dated: `REGIONS_CHECKED = '2026-11-03'` with a 12-month re-check (`src/lib/consent/regions.ts:14-15`). The wiretap list has its own 6-month date ([[entities/consent-wiretap]]).

## From mode to behaviour

`MODE_RULES[mode]` gives `optIn`, banner kind, default grants, GPC requirement, Do Not Sell link and choice lifetime (`src/lib/consent/regions.ts:100-136`). In an ask-first mode, a choice made under an opt-out mode is not usable, so the visitor is asked again. GPC always forces marketing off (`src/lib/consent/regions.ts:150-161`).

Related: [[entities/consent-regions]], [[entities/consent-manager]].
