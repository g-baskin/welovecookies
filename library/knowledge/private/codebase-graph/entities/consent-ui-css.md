---
type: entity
title: "ui-css.ts"
entity_type: module
status: seed
created: "2026-11-09"
updated: "2026-11-09"
path: "src/lib/consent/ui-css.ts"
language: ts
depends_on: []
used_by:
  - "[[entities/consent-ui]]"
last_commit_hash: "888ca73"
tested_by:
  - "src/lib/consent/ui.test.ts"
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related: []
sources:
  - "src/lib/consent/ui-css.ts:1-81"
---
# ui-css.ts

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Overview

Static strings for the Shadow DOM: `CSS`, the `SWITCH_KNOB` markup and the `COOKIE_SVG` default picture (`src/lib/consent/ui-css.ts:1-2`, `src/lib/consent/ui-css.ts:78`, `src/lib/consent/ui-css.ts:81`). It has no imports.

## Signature / Definition

```ts
export const CSS: string;          // :2-75
export const SWITCH_KNOB: string;  // :78
export const COOKIE_SVG: string;   // :81
```

## Behavior

- Each variable falls back from `--ec-*` (set by `config.theme`) to the page's `--color-*`, `--radius-theme`, `--radius-button` and `--font-body`, then to built-in defaults (`src/lib/consent/ui-css.ts:3`, `src/lib/consent/ui-css.ts:5`).
- The banner is fixed with `z-index:2147483000`, sits bottom-left by default, mirrors under RTL, and is centred on portrait tablets in `auto` position (`src/lib/consent/ui-css.ts:6-10`).

## Connections

- **used_by:** [[entities/consent-ui]]

## Tested by

- Indirectly by `src/lib/consent/ui.test.ts`

## History

- **Created:** commit `888ca73` (2026-11-09) "Add We Love Cookies: location-aware cookie consent"
