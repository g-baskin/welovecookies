---
type: entity
title: 'admin/src/index.ts (Worker router and daily job)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/index.ts
language: ts
depends_on:
  - "[[entities/admin-auth]]"
  - "[[entities/admin-config]]"
  - "[[entities/admin-db]]"
  - "[[entities/admin-html]]"
  - "[[entities/admin-log]]"
  - "[[entities/admin-pages-banner]]"
  - "[[entities/admin-pages-layout]]"
  - "[[entities/admin-pages-login]]"
  - "[[entities/admin-pages-overview]]"
  - "[[entities/admin-pages-records]]"
  - "[[entities/admin-pages-requests]]"
  - "[[entities/admin-pages-sites]]"
  - "[[entities/admin-privacy]]"
  - "[[entities/admin-record]]"
  - "[[entities/admin-requests]]"
used_by: []
last_commit_hash: baf8b7a
tested_by:
  - admin/src/index.test.ts
  - admin/src/review.test.ts
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related: []
sources:
  - admin/src/index.ts:1-129
---

# admin/src/index.ts (Worker router and daily job)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Entry point of the optional admin Worker (ADR 0007): routes public banner endpoints, the hosted privacy form, `/wlc.css` and the signed-in admin pages, and runs the daily job (`admin/src/index.ts:1-2`).

## Signature / Definition

```ts
export async function route(request: Request, env: Env, now?: number): Promise<Response>
export async function daily(db: Db, now?: number): Promise<{ purged; checked }>
export default { fetch(request, env: WorkerEnv), scheduled(_c, env, ctx) }
```

## Behavior

- **Public rate limit.** `/api/consent*` and `POST /privacy/*` return 429 with `retry-after: 60` when the optional `PUBLIC_LIMITER` binding refuses; key is path (or `privacy`) plus `ipHash` (`admin/src/index.ts:81-92`). OPTIONS and missing binding skip it (`admin/src/index.ts:82`).
- **Public routes.** `/api/consent/config` (GET/OPTIONS), `/api/consent` and `/api/consent/seen` (POST/OPTIONS) (`admin/src/index.ts:93-95`); `/privacy/ws_<12>` (`admin/src/index.ts:96-97`); `/wlc.css` serves `CSS` cached 1h (`admin/src/index.ts:98`); `/` redirects to `/admin` (`admin/src/index.ts:99`).
- **Admin gate** (`admin/src/index.ts:28-78`): setup check first (503 setup page) (`admin/src/index.ts:29-30`); only GET/HEAD/POST (`admin/src/index.ts:34`); `/admin/login` is open (`admin/src/index.ts:35`); otherwise session must verify, else POST 403 / GET redirect (`admin/src/index.ts:36-37`); every admin POST must pass `sameOrigin` (`admin/src/index.ts:38`); logout is POST only (`admin/src/index.ts:39`); form bodies capped at 65,536 bytes, 413 otherwise (`admin/src/index.ts:24`, `admin/src/index.ts:41-42`).
- **Site selection.** `form.site` or `?site=`, else first enabled, else first site (`admin/src/index.ts:44-45`). Builds `Ctx` incl. open-request count (`admin/src/index.ts:46-56`).
- **Admin routes** switch (`admin/src/index.ts:57-77`): request detail matches `pr_` + 16 chars (`admin/src/index.ts:57-58`).
- **Errors.** Uncaught errors log the message and return a plain 500 (`admin/src/index.ts:118-124`).
- **Daily job.** `purgeOld` first, then `checkAllSites`; a tracking failure is logged, not thrown (`admin/src/index.ts:105-115`). `scheduled` wraps it in `waitUntil` (`admin/src/index.ts:126-128`).

## Gotchas

- Static assets (`welovecookies.min.js`) are served by the Workers assets binding from `admin/public/`, not by this router; that directory is gitignored and filled by `npm run build` / `npm run admin:assets`.

## Connections

- **depends_on:** [[entities/admin-auth]], [[entities/admin-config]], [[entities/admin-db]], [[entities/admin-html]], [[entities/admin-log]], [[entities/admin-pages-banner]], [[entities/admin-pages-layout]], [[entities/admin-pages-login]], [[entities/admin-pages-overview]], [[entities/admin-pages-records]], [[entities/admin-pages-requests]], [[entities/admin-pages-sites]], [[entities/admin-privacy]], [[entities/admin-record]], [[entities/admin-requests]]
- **used_by:** none (no non-test importer)

## Tested by

- `admin/src/index.test.ts`
- `admin/src/review.test.ts`

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/index.ts`).

## Sources

- `admin/src/index.ts:1-129`
