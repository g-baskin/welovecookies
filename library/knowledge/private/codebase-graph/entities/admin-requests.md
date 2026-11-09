---
type: entity
title: 'admin/src/requests.ts (privacy request records)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/requests.ts
language: ts
depends_on:
  - "[[entities/consent-cookie]]"
  - "[[entities/admin-auth]]"
  - "[[entities/admin-db]]"
  - "[[entities/admin-settings]]"
used_by:
  - "[[entities/admin-index]]"
  - "[[entities/admin-privacy]]"
  - "[[entities/admin-pages-overview]]"
  - "[[entities/admin-pages-requests]]"
last_commit_hash: baf8b7a
tested_by:
  - admin/src/data.test.ts
  - admin/src/review.test.ts
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related: []
sources:
  - admin/src/requests.ts:1-167
---

# admin/src/requests.ts (privacy request records)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Privacy requests from the hosted form. Never stores an IP and never changes website data by itself (`admin/src/requests.ts:1-2`).

## Signature / Definition

```ts
export const REQUEST_KINDS = ['delete','copy','correct','stop_selling']
export const REQUEST_STATUSES = ['new','in_progress','done','declined']
export function dueDaysFor(country): number            // BR 15, US 45, else 30
export const EMAIL_DAILY_LIMIT = 3; SITE_DAILY_LIMIT = 100; IP_DAILY_LIMIT = 5
export function parseRequestForm(f)
export async function createRequest(db, site, input, place, now?, ipHash?)
export async function listRequests(db, site, filter); getRequest(db, id)
export async function updateRequest(db, id, status, note, now?); deleteRequest(db, id)
export async function requestCounts(db, site, now?); export function dueLabel(dueAt, now)
```

## Behavior

- `EMAIL_RE` rejects `? & = # /` and `%` so a `mailto:` link cannot carry extra headers (`admin/src/requests.ts:47-48`).
- `createRequest` limits: 5/day per IP hash via `rate_events`, 3/day per email, 100/day per site (`admin/src/requests.ts:79-92`). Id is `pr_` + `newConsentId()` (`admin/src/requests.ts:94`). With an IP hash, the insert and the rate event go in one `db.batch` (`admin/src/requests.ts:100-101`).
- `updateRequest` stamps `closed_at` once on done/declined, clears it on reopen; note cut to 2000 (`admin/src/requests.ts:134-142`).
- Overdue uses UTC calendar days; due today is not overdue (`admin/src/requests.ts:150-167`).

## Connections

- **depends_on:** [[entities/consent-cookie]], [[entities/admin-auth]], [[entities/admin-db]], [[entities/admin-settings]]
- **used_by:** [[entities/admin-index]], [[entities/admin-privacy]], [[entities/admin-pages-overview]], [[entities/admin-pages-requests]]

## Tested by

- `admin/src/data.test.ts`
- `admin/src/review.test.ts`

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/requests.ts`).

## Sources

- `admin/src/requests.ts:1-167`
