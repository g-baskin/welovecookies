---
type: entity
title: "i18n.ts"
entity_type: module
status: seed
created: "2026-11-09"
updated: "2026-11-09"
path: "src/lib/consent/i18n.ts"
language: ts
depends_on:
  - "[[entities/consent-i18n-rows]]"
  - "[[entities/consent-types]]"
used_by:
  - "[[entities/consent-manager]]"
  - "[[entities/consent-index]]"
last_commit_hash: "888ca73"
tested_by:
  - "src/lib/consent/i18n.test.ts"
  - "src/lib/consent/ui.test.ts"
  - "src/lib/consent/contract.test.ts"
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related:
  - "[[concepts/config-precedence]]"
sources:
  - "src/lib/consent/i18n.ts:1-75"
---
# i18n.ts

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Overview

Built-in banner texts for 20 languages, plus language picking and owner overrides (`src/lib/consent/i18n.ts:1-3`). It maps the positional rows from [[entities/consent-i18n-rows]] onto `ConsentTexts`.

## Signature / Definition

```ts
export const LANGUAGES: readonly string[];        // sorted keys of all rows
export const DEFAULT_LANGUAGE = 'en';
export function builtInTexts(lang): ConsentTexts;
export function pickLanguage(preferred, forced?): string;
export const isRtl: (lang) => boolean;
export function textsFor(lang, overrides?): ConsentTexts;
```

## Behavior

- `toTexts` maps row indexes 0-31 to fields **by position** (`src/lib/consent/i18n.ts:14-28`). A swapped string still typechecks. Any field change must update `row.ts`, `toTexts` and every row together.
- The primary subtag is lower-cased, and `no`/`nn` map to `nb` (`src/lib/consent/i18n.ts:34-37`). Unknown languages fall back to English (`src/lib/consent/i18n.ts:39-51`).
- The RTL set is `ar he fa ur` (`src/lib/consent/i18n.ts:32`), but only `ar` has a row.
- `textsFor` layers built-ins, then `overrides['*']`, then `overrides[lang]`. Nested `categories` and `cookieTable` merge key by key. Blank strings are ignored, so they fall back to the built-in text (`src/lib/consent/i18n.ts:55-75`).

## Connections

- **depends_on:** [[entities/consent-i18n-rows]], [[entities/consent-types]]
- **used_by:** [[entities/consent-manager]], [[entities/consent-index]]
- **related concepts:** [[concepts/config-precedence]]

## Tested by

- `src/lib/consent/i18n.test.ts`, `src/lib/consent/ui.test.ts`, `src/lib/consent/contract.test.ts:109-121` (overrides)

## History

- **Created:** commit `888ca73` (2026-11-09) "Add We Love Cookies: location-aware cookie consent"
