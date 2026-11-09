---
type: entity
title: "auto-hide.ts"
entity_type: function
status: seed
created: "2026-11-09"
updated: "2026-11-09"
path: "src/lib/consent/auto-hide.ts"
language: ts
depends_on: []
used_by:
  - "[[entities/consent-ui]]"
last_commit_hash: "888ca73"
tested_by:
  - "src/lib/consent/auto-hide.test.ts"
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related: []
sources:
  - "src/lib/consent/auto-hide.ts:1-41"
---
# auto-hide.ts (`autoHide`)

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Overview

Hides the floating reopen button once, at whichever comes first: `FAB_HIDE_MS = 5000`, the first real page scroll (24 px or more), or focus or input in a search box (`src/lib/consent/auto-hide.ts:1-13`).

## Signature / Definition

```ts
export const FAB_HIDE_MS = 5000;
export function autoHide(win, hide: () => void, delay = FAB_HIDE_MS): () => void; // returns stop
```

## Behavior

- The scroll listener is at window level and passive, not capture, so a carousel's scroll does not count (`src/lib/consent/auto-hide.ts:29-30`). Search focus and input are caught in the capture phase (`src/lib/consent/auto-hide.ts:31-32`).
- `stop()` is idempotent and removes every listener and the timer (`src/lib/consent/auto-hide.ts:33-40`).

## Connections

- **used_by:** [[entities/consent-ui]] (`src/lib/consent/ui.ts:282`)

## Tested by

- `src/lib/consent/auto-hide.test.ts`

## History

- **Created:** commit `888ca73` (2026-11-09) "Add We Love Cookies: location-aware cookie consent"
