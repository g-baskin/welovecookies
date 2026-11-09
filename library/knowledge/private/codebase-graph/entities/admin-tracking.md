---
type: entity
title: 'admin/src/tracking.ts (tracking check)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/tracking.ts
language: ts
depends_on:
  - "[[entities/consent-regions]]"
  - "[[entities/consent-types]]"
  - "[[entities/consent-wiretap]]"
  - "[[entities/admin-db]]"
  - "[[entities/admin-labels]]"
  - "[[entities/admin-settings]]"
used_by:
  - "[[entities/admin-pages-overview]]"
  - "[[entities/admin-pages-sites]]"
last_commit_hash: baf8b7a
tested_by:
  - admin/src/data.test.ts
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related: []
sources:
  - admin/src/tracking.ts:1-211
---

# admin/src/tracking.ts (tracking check)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

The tracking check: rule-based reminders, no outside calls. Runs daily from the cron and on "Check now"; not legal advice (`admin/src/tracking.ts:1-2`).

## Signature / Definition

```ts
export const STATE_LIST_RECHECK_DAYS = 180; REGIONS_RECHECK_DAYS = 365; NO_VIEWS_DAYS = 7
export const INTEGRATION_CATEGORIES
export function trackingIssues(f: TrackingFacts, now): TrackingIssue[]
export async function gatherFacts(db, sites, now?)
export async function runChecks(db, sites, now?); runCheck(db, site, now?)
export async function allLatestChecks(db); latestCheck(db, key)
export function trackingSummary(issues): string
```

## Behavior

- Issues (`admin/src/tracking.ts:42-112`): no privacy link (fix); banner off (check); empty cookie list (fix); integration on without cookies in its categories (fix); overdue privacy requests (fix); no views or choices for 7 days on an enabled site older than 7 days (check); `ALL_PARTY_STATES_CHECKED` older than 180 days (check); `REGIONS_CHECKED` older than 365 days (check).
- `gatherFacts` uses three grouped queries regardless of site count (`admin/src/tracking.ts:115-148`).
- `runChecks` upserts all results into `check_results` in one `db.batch` (`admin/src/tracking.ts:151-169`).
- Stored `issues_json` that fails to parse reads as `[]` (`admin/src/tracking.ts:186-193`).

## Connections

- **depends_on:** [[entities/consent-regions]], [[entities/consent-types]], [[entities/consent-wiretap]], [[entities/admin-db]], [[entities/admin-labels]], [[entities/admin-settings]]
- **used_by:** [[entities/admin-pages-overview]], [[entities/admin-pages-sites]]

## Tested by

- `admin/src/data.test.ts`

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/tracking.ts`).

## Sources

- `admin/src/tracking.ts:1-211`
