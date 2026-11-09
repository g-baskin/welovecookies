---
type: entity
title: 'admin/src/pages/layout.ts (admin page frame and Ctx)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/pages/layout.ts
language: ts
depends_on:
  - "[[entities/admin-db]]"
  - "[[entities/admin-html]]"
used_by:
  - "[[entities/admin-index]]"
  - "[[entities/admin-pages-banner]]"
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
related: []
sources:
  - admin/src/pages/layout.ts:1-65
---

# admin/src/pages/layout.ts (admin page frame and Ctx)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Shared admin frame: nav, website switcher, sign-out form, flash messages; defines the request context `Ctx` (`admin/src/pages/layout.ts:1-17`).

## Signature / Definition

```ts
export interface Ctx { request; env; db; url; now; sites; site; openRequests; form? }
export const siteQuery = (ctx) => string
export function adminPage(ctx, title, active, body: Html, opts?): Response
export const noSitePrompt = () => Html
```

## Behavior

- Flash text is chosen from a fixed map by `?ok=`, never echoed (`admin/src/pages/layout.ts:29-36`, `admin/src/pages/layout.ts:48`).
- Requests nav item shows the open-request count (`admin/src/pages/layout.ts:56`).
- Status defaults to 400 when an error is passed, else 200 (`admin/src/pages/layout.ts:60`).

## Connections

- **depends_on:** [[entities/admin-db]], [[entities/admin-html]]
- **used_by:** [[entities/admin-index]], [[entities/admin-pages-banner]], [[entities/admin-pages-overview]], [[entities/admin-pages-records]], [[entities/admin-pages-requests]], [[entities/admin-pages-sites]]

## Tested by

- No test file imports this module directly.

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/pages/layout.ts`).

## Sources

- `admin/src/pages/layout.ts:1-65`
