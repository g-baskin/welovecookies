---
type: entity
title: "wiretap.ts"
entity_type: module
status: seed
created: "2026-11-09"
updated: "2026-11-09"
path: "src/lib/consent/wiretap.ts"
language: ts
depends_on:
  - "[[entities/consent-regions]]"
  - "[[entities/consent-manager]]"
used_by:
  - "[[entities/admin-tracking]]"
last_commit_hash: "888ca73"
tested_by:
  - "src/lib/consent/wiretap.test.ts"
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
  - "legal-dated"
related: []
sources:
  - "src/lib/consent/wiretap.ts:1-35"
---
# wiretap.ts

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Overview

A helper for buyers covering US all-party-consent states. There, an identifying tag (one that identifies visitors or records sessions) needs an explicit Accept (`src/lib/consent/wiretap.ts:4-5`). **The banner never calls it.** No consent module imports it, and the ESM barrel does not export it (`src/lib/consent/index.ts:1-19`).

## Signature / Definition

```ts
export const ALL_PARTY_STATES_CHECKED = '2026-11-03';       // re-check every 6 months
export const ALL_PARTY_CONSENT_STATES: ReadonlySet<string>; // CA CT DE FL IL MD MA MT NV NH PA WA
export function needsExplicitClick(country?, region?): boolean;
export function mayLoadIdentifyingTag(state, place, now?): boolean;
```

## Behavior

- **Dated legal data:** `ALL_PARTY_STATES_CHECKED` (`src/lib/consent/wiretap.ts:7-8`). The admin tracking check reads it (`admin/src/tracking.ts:5`).
- `needsExplicitClick` returns true for unknown, `XX` or `T1` countries, for the US without a state, and for listed states. It returns false for any other non-US country, because those already ask first or have no such law (`src/lib/consent/wiretap.ts:14-21`).
- `mayLoadIdentifyingTag` requires marketing. Where a click is needed, it also requires a current stored choice with marketing whose action is `accept_all`, or `custom` made under `opt-in` (`src/lib/consent/wiretap.ts:23-35`).
- The dependency on `consent.ts` is type-only (`src/lib/consent/wiretap.ts:2`).

## Connections

- **depends_on:** [[entities/consent-regions]] (`isCurrent`), [[entities/consent-manager]] (type `ConsentState`)
- **used_by:** [[entities/admin-tracking]] (constant only)

## Tested by

- `src/lib/consent/wiretap.test.ts`

## History

- **Created:** commit `888ca73` (2026-11-09) "Add We Love Cookies: location-aware cookie consent"
