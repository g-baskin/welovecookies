---
type: entity
title: "ui.ts (createUi)"
entity_type: module
status: seed
created: "2026-11-09"
updated: "2026-11-09"
path: "src/lib/consent/ui.ts"
language: ts
depends_on:
  - "[[entities/consent-ui-css]]"
  - "[[entities/consent-auto-hide]]"
  - "[[entities/consent-types]]"
used_by:
  - "[[entities/consent-manager]]"
last_commit_hash: "f14f71e"
tested_by:
  - "src/lib/consent/ui.test.ts"
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related:
  - "[[concepts/choice-lifecycle]]"
sources:
  - "src/lib/consent/ui.ts:1-60"
  - "src/lib/consent/ui.ts:119-145"
  - "src/lib/consent/ui.ts:157"
  - "src/lib/consent/ui.ts:192-228"
  - "src/lib/consent/ui.ts:282-286"
---
# ui.ts

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Overview

A plain DOM renderer inside a Shadow DOM host: a non-modal banner (`role=region`), a modal preferences panel (focus trap, Esc, focus return), a floating reopen button and a toast. It uses no framework (`src/lib/consent/ui.ts:1-4`).

## Signature / Definition

```ts
export function createUi(doc: Document, config: ConsentConfig, st: UiState, h: UiHandlers): Ui;
interface Ui { banner(kind); panel(grants); closePanel(); floating(show); toast(msg); destroy() }
```
(`src/lib/consent/ui.ts:16-38`, `src/lib/consent/ui.ts:52`)

## Behavior

- Creates a `<we-love-cookies>` host with an open shadow root. `config.theme` values become `--ec-*` properties on the host (`src/lib/consent/ui.ts:40-44`, `src/lib/consent/ui.ts:53-60`).
- Interpolated text is escaped. Links only accept `https?:`, `/`, `#` or `mailto:`. Logo images only accept `https?:`, a root path or `data:image/` (`src/lib/consent/ui.ts:46-50`).
- The banner section has `role="region"` and `data-pos` from `config.position` (`src/lib/consent/ui.ts:157`). Switches use `role="switch"` and Necessary is disabled (`src/lib/consent/ui.ts:192`). The panel is `role="dialog" aria-modal="true"` (`src/lib/consent/ui.ts:201`) and closes on Escape (`src/lib/consent/ui.ts:228`).
- `avoidSelector` lifts the banner above a fixed bottom bar, using a ResizeObserver (`src/lib/consent/ui.ts:119`, `src/lib/consent/ui.ts:140-145`).
- The floating button hides itself through `autoHide` (`src/lib/consent/ui.ts:282`). The toast is `role="status"` (`src/lib/consent/ui.ts:284-286`).

## Connections

- **depends_on:** [[entities/consent-ui-css]], [[entities/consent-auto-hide]], [[entities/consent-types]]
- **used_by:** [[entities/consent-manager]]
- **related concepts:** [[concepts/choice-lifecycle]]

## Tested by

- `src/lib/consent/ui.test.ts`

## History

- **Created:** commit `888ca73` (2026-11-09) "Add We Love Cookies: location-aware cookie consent"
- **Last touched:** commit `f14f71e` (2026-11-09), any-website install (PR #3)
