---
type: entity
title: 'admin/src/privacy.ts (hosted "Ask about your data" form)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/privacy.ts
language: ts
depends_on:
  - "[[entities/admin-auth]]"
  - "[[entities/admin-config]]"
  - "[[entities/admin-db]]"
  - "[[entities/admin-html]]"
  - "[[entities/admin-requests]]"
used_by:
  - "[[entities/admin-index]]"
last_commit_hash: baf8b7a
tested_by:
  - admin/src/public.test.ts
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related: []
sources:
  - admin/src/privacy.ts:1-92
---

# admin/src/privacy.ts (hosted "Ask about your data" form)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

`GET|POST /privacy/<site key>`: public privacy-request form a website links to. Works without JavaScript; honeypot submissions get the thank-you page and nothing is kept (`admin/src/privacy.ts:1-2`). Stores via [[entities/admin-requests]].

## Signature / Definition

```ts
export async function handlePrivacy(request, env, key, now?): Promise<Response>
```

## Behavior

- Unknown or disabled site -> 404 page (`admin/src/privacy.ts:67-68`).
- GET renders the form, pre-selecting a valid `?kind=` (`admin/src/privacy.ts:72-75`); other methods -> 405 (`admin/src/privacy.ts:76-77`).
- POST requires `Origin` == the Worker origin, else 403 (`admin/src/privacy.ts:78-79`); body capped at 8192 bytes, 413 otherwise (`admin/src/privacy.ts:16`, `admin/src/privacy.ts:80-81`).
- Field values cut to 2000 chars; non-empty hidden `website` field = bot, returns success without saving (`admin/src/privacy.ts:82-85`).
- Validation errors -> 400; limits from `createRequest` -> 429 (`admin/src/privacy.ts:86-90`). IP hash only when `SESSION_SECRET` is set (`admin/src/privacy.ts:88`).
- Due days shown come from `dueDaysFor(placeOf(request).country)` (`admin/src/privacy.ts:71`).

## Connections

- **depends_on:** [[entities/admin-auth]], [[entities/admin-config]], [[entities/admin-db]], [[entities/admin-html]], [[entities/admin-requests]]
- **used_by:** [[entities/admin-index]]

## Tested by

- `admin/src/public.test.ts`

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/privacy.ts`).

## Sources

- `admin/src/privacy.ts:1-92`
