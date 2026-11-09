---
type: entity
title: "i18n rows (row.ts + a.ts\u2013d.ts)"
entity_type: data-model
status: seed
created: "2026-11-09"
updated: "2026-11-09"
path: "src/lib/consent/i18n/row.ts"
language: ts
depends_on: []
used_by:
  - "[[entities/consent-i18n]]"
last_commit_hash: "888ca73"
tested_by:
  - "src/lib/consent/i18n.test.ts"
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
  - "i18n"
related: []
sources:
  - "src/lib/consent/i18n/row.ts:1-11"
  - "src/lib/consent/i18n/a.ts"
  - "src/lib/consent/i18n/b.ts"
  - "src/lib/consent/i18n/c.ts"
  - "src/lib/consent/i18n/d.ts"
---
# i18n rows (`i18n/row.ts` + `i18n/a.ts`–`d.ts`)

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Overview

Each language is one **positional 32-field tuple**. This keeps the bundle small (`src/lib/consent/i18n/row.ts:1-11`). Row files: `a.ts` en es fr de it, `b.ts` pt nl pl sv da, `c.ts` nb fi ja ko zh, `d.ts` tr ar th vi id. Each file exports an object (`A`–`D`) and is marked `// prettier-ignore`.

## Signature / Definition

```ts
export type Row = [title, body, noticeBody, acceptAll, rejectAll, customize, acknowledge, save, close,
  preferencesTitle, preferencesIntro, alwaysOn, necessary, necessaryDesc, preferences, preferencesDesc,
  analytics, analyticsDesc, marketing, marketingDesc, showCookies, hideCookies, tName, tProvider,
  tPurpose, tDuration, privacyPolicy, cookiePolicy, reopen, doNotSell, gpcHonored, saved];
```

## Gotchas

- Adding or reordering a field means editing `row.ts`, `toTexts` in `src/lib/consent/i18n.ts:14-28` and all 20 rows. Labels are only tuple names, so swapped strings still typecheck.
- Any change to wording must cover all 20 languages. Do not reformat the rows.
- The `last_commit_hash` is for `row.ts`. The row files were last touched in `f14f71e`.

## Connections

- **used_by:** [[entities/consent-i18n]]

## Tested by

- `src/lib/consent/i18n.test.ts`

## History

- **Created:** commit `888ca73` (2026-11-09) "Add We Love Cookies: location-aware cookie consent"
