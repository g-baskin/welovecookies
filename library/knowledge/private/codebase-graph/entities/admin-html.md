---
type: entity
title: 'admin/src/html.ts (escaping template, security headers, CSS)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/html.ts
language: ts
depends_on: []
used_by:
  - "[[entities/admin-index]]"
  - "[[entities/admin-config]]"
  - "[[entities/admin-privacy]]"
  - "[[entities/admin-record]]"
  - "[[entities/admin-pages-banner]]"
  - "[[entities/admin-pages-layout]]"
  - "[[entities/admin-pages-login]]"
  - "[[entities/admin-pages-overview]]"
  - "[[entities/admin-pages-records]]"
  - "[[entities/admin-pages-requests]]"
  - "[[entities/admin-pages-sites]]"
last_commit_hash: baf8b7a
tested_by: []
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related:
  - "[[concepts/admin-request-security]]"
sources:
  - admin/src/html.ts:1-97
---

# admin/src/html.ts (escaping template, security headers, CSS)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Server-rendered HTML where every interpolated value is escaped unless it is already `Html` (`admin/src/html.ts:1`). See [[concepts/admin-request-security]].

## Signature / Definition

```ts
export class Html { constructor(readonly s: string) }
export const esc = (s: string) => string
export function html(strings, ...values): Html
export const raw = (s: string) => new Html(s)   // trusted markup only
export function htmlResponse(body: Html, status?, headers?)
export const json = (data, status?, headers?) => Response
export const redirect = (location, headers?) => Response   // 303
export function plainPage(title, body: Html): Html
export const CSS: string
```

## Behavior

- `esc` escapes `& < > " ' \`` (`admin/src/html.ts:9-15`); `render` drops null/undefined/false, passes `Html` through, flattens arrays (`admin/src/html.ts:17-22`).
- `raw()` is for trusted markup only, never visitor or owner text (`admin/src/html.ts:30-31`).
- Every HTML response gets: `cache-control: private, no-store`; CSP `default-src 'none'; style-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`; `nosniff`; `referrer-policy: same-origin`; `x-frame-options: DENY` (`admin/src/html.ts:33-48`).
- `json` responses are `private, no-store` (`admin/src/html.ts:50-58`); `redirect` is 303 `no-store` (`admin/src/html.ts:60-64`).
- `plainPage` adds `robots: noindex` and links `/wlc.css` (`admin/src/html.ts:67-69`).

## Gotchas

- The CSP has no `script-src` and `style-src 'self'` only, so inline `<style>`, `style=""` and any script are blocked. New styles go in `CSS` (`admin/src/html.ts:71-97`), served at `/wlc.css` by [[entities/admin-index]].

## Connections

- **depends_on:** none
- **used_by:** [[entities/admin-index]], [[entities/admin-config]], [[entities/admin-privacy]], [[entities/admin-record]], [[entities/admin-pages-banner]], [[entities/admin-pages-layout]], [[entities/admin-pages-login]], [[entities/admin-pages-overview]], [[entities/admin-pages-records]], [[entities/admin-pages-requests]], [[entities/admin-pages-sites]]
- **related concepts:** [[concepts/admin-request-security]]

## Tested by

- No test file imports this module directly.

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/html.ts`).

## Sources

- `admin/src/html.ts:1-97`
