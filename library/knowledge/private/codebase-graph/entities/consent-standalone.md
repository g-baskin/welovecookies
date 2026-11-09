---
type: entity
title: "standalone.ts (window.WeLoveCookies)"
entity_type: module
status: seed
created: "2026-11-09"
updated: "2026-11-09"
path: "src/lib/consent/standalone.ts"
language: ts
depends_on:
  - "[[entities/consent-manager]]"
  - "[[entities/consent-signals]]"
  - "[[entities/consent-types]]"
used_by: []
last_commit_hash: "f14f71e"
tested_by:
  - "src/lib/consent/standalone.test.ts"
  - "src/lib/consent/standalone.dom.test.ts"
  - "src/lib/consent/dist.test.ts"
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related:
  - "[[concepts/config-precedence]]"
  - "[[concepts/choice-lifecycle]]"
sources:
  - "src/lib/consent/standalone.ts:1-105"
---
# standalone.ts

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Overview

The entry point of the one-tag script build. It sets `window.WeLoveCookies` and starts automatically from `window.WeLoveCookiesConfig` and the script tag's `data-*` attributes (`src/lib/consent/standalone.ts:1-6`). `tools/build-consent.mjs:21-26` bundles it as an IIFE into `dist/welovecookies.min.js` (ADR 0005, ADR 0006).

## Signature / Definition

```ts
export async function loadHosted(site, scriptSrc, doFetch): Promise<ConsentConfig>;
export function hostedDefaults(w: SignalTarget): void;
export function fromScript(s: HTMLScriptElement | null): Partial<ConsentConfig>;
window.WeLoveCookies: Partial<ConsentManager> & { init(c?, o?): ConsentManager }
```

## Behavior

- `init` destroys any earlier manager and merges `{mode:'auto', rev:1, floatingButton:true}`, then `fromScript`, then `WeLoveCookiesConfig`, then the `init` args. It then copies the manager's methods onto the global (`src/lib/consent/standalone.ts:77-92`). See [[concepts/config-precedence]].
- `fromScript` reads `data-mode/rev/lang/position/floating/preferences/avoid/gpc/record/seen/privacy/cookies-page/choices` (`src/lib/consent/standalone.ts:56-72`).
- **Hosted install** (`data-site` set and `script.src` present): first `hostedDefaults` sets Google and UET to denied (`src/lib/consent/standalone.ts:51-54`). Then `loadHosted` fetches `/api/consent/config?site=` from the script's origin with `credentials:'omit'` (`src/lib/consent/standalone.ts:30-49`), and the result is passed as the `init` args (`src/lib/consent/standalone.ts:95-101`). On any failure it falls back to `{mode:'auto', rev:1, floatingButton:true, site}` (`src/lib/consent/standalone.ts:35`).
- `data-auto="false"` skips the automatic start, including on the hosted path, where the fetch still happens but `init` is not called (`src/lib/consent/standalone.ts:100-104`).

## Connections

- **depends_on:** [[entities/consent-manager]], [[entities/consent-signals]], [[entities/consent-types]]
- **used_by:** none by import; it is a build entry point (`tools/build-consent.mjs:21-26`)
- **related concepts:** [[concepts/config-precedence]]

## Tested by

- `src/lib/consent/standalone.test.ts`, `src/lib/consent/standalone.dom.test.ts` (layering), `src/lib/consent/dist.test.ts` (committed build matches)

## History

- **Created:** commit `888ca73` (2026-11-09) "Add We Love Cookies: location-aware cookie consent"
- **Last touched:** commit `f14f71e` (2026-11-09), any-website install (PR #3)
