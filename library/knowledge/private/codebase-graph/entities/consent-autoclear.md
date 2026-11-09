---
type: entity
title: "autoclear.ts"
entity_type: module
status: seed
created: "2026-11-09"
updated: "2026-11-09"
path: "src/lib/consent/autoclear.ts"
language: ts
depends_on:
  - "[[entities/consent-types]]"
used_by:
  - "[[entities/consent-manager]]"
last_commit_hash: "f14f71e"
tested_by:
  - "src/lib/consent/autoclear.test.ts"
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related:
  - "[[concepts/choice-lifecycle]]"
sources:
  - "src/lib/consent/autoclear.ts:1-139"
---
# autoclear.ts

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Overview

Auto-clear deletes the known cookies and storage keys of every category that is off. The technical names exist only in code and are never shown to visitors (`src/lib/consent/autoclear.ts:1-5`). The module also provides the root-domain candidates that the manager uses for `cookieDomain: 'auto'`.

## Signature / Definition

```ts
export const AUTO_CLEAR: Record<OptionalCategory, readonly string[]>;
export function matchesPattern(name, patterns): boolean;   // trailing * = prefix
export function offCategories(grants), patternsFor(grants, extra?);
export function namesToClear(header, patterns, keep): string[];
export function isLocalOrIp(hostname), rootCandidates(hostname), deletionStrings(name, host, path);
export function clearOff(w, grants, extra, keep): string[];
```

## Behavior

- The built-in list has no `preferences` names. Analytics covers GA, PostHog, Clarity, Hotjar, Matomo, Mixpanel and Segment. Marketing covers Meta, TikTok, Google Ads, Microsoft Ads, Pinterest, Snap, Reddit and LinkedIn (`src/lib/consent/autoclear.ts:9-30`).
- The owner's `config.autoClear` extras are added for each category that is off (`src/lib/consent/autoclear.ts:42-48`).
- The consent cookie (`keep`) is never cleared (`src/lib/consent/autoclear.ts:50-63`, `src/lib/consent/autoclear.ts:131`).
- `rootCandidates` lists the shortest suffix first. Browsers refuse public suffixes, so the first that sticks is the root. localhost and IP hosts get none (`src/lib/consent/autoclear.ts:65-88`).
- Deletion covers path `/` and the current path, host-only plus every parent domain, both with and without a leading dot (`src/lib/consent/autoclear.ts:90-101`). It also clears matching keys in localStorage and sessionStorage, and ignores errors when storage is blocked (`src/lib/consent/autoclear.ts:111-139`).

## Connections

- **depends_on:** [[entities/consent-types]]
- **used_by:** [[entities/consent-manager]] (`clearOff`, `rootCandidates`: `src/lib/consent/consent.ts:5`)
- **related concepts:** [[concepts/choice-lifecycle]]

## Tested by

- `src/lib/consent/autoclear.test.ts`

## History

- **Created:** commit `888ca73` (2026-11-09) "Add We Love Cookies: location-aware cookie consent"
- **Last touched:** commit `f14f71e` (2026-11-09), any-website install (PR #3)
