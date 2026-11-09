---
type: entity
title: "Compliance tracking and privacy check: admin/compliance/tracking.ts and admin/server/compliance/tracking.ts"
entity_type: scheduled-hook
status: developing
created: 2026-11-04
updated: 2026-11-04
path: "src/lib/admin/server/compliance/tracking.ts"
language: ts
depends_on: ["server-consent-settings-sites.md", "server-consent-state-record.md", "storefront-consent-visitor-pixel.md"]
used_by: []
last_commit_hash: "89960fc"
partial_scan: true
tested_by: ["src/lib/admin/compliance/tracking.test.ts"]
tags: ["entity", "compliance", "ai-team", "privacy", "pixel", "cron"]
related: ["admin-privacy-routes.md"]
sources: ["src/lib/admin/compliance/tracking.ts", "src/lib/admin/server/compliance/tracking.ts", "src/lib/admin/server/ai-functions.ts", "src/lib/admin/server/compliance.ts", "src/routes/admin/compliance/+page.server.ts"]
---

# Compliance tracking and privacy check

## Overview
A rules-only check (no AI, no outside calls) that the Compliance reviewer runs on the owner's schedule (off, daily or weekly at 9:00 store time) and on Check now (`src/lib/admin/compliance/tracking.ts:4-10`). It checks the cookie banner, privacy policy, the visitor ID pixel in the cookie list, the pixel company's details on file, and the age of the all-party-consent state list. Both tracking files read in full at 89960fc; callers at cited lines.

## Rules (`src/lib/admin/compliance/tracking.ts`)
`trackingIssues(facts, now)` (`:36-77`) returns issues with `level` `fix` or `check`:
- `privacy_policy` (fix): no published privacy policy (`:38-44`).
- `banner_off` (check): banner off, so the pixel never loads (`:45-51`).
- `pixel_not_listed` (fix): no cookie list row mentions the pixel domains (`:52-58`). `DEFAULT_COOKIES` has no such row (`src/lib/server/consent/settings.ts:124-197`), so this fires until the owner adds one.
- `vendor_details` (check): vendor details never marked, or older than 365 days (`:11`, `:59-68`).
- `state_list` (check): `ALL_PARTY_STATES_CHECKED` older than 180 days (`:12`, `:69-75`).
`trackingPeriod` gives the open period's start day: daily from 9:00, weekly from Monday 9:00, missed slots caught up within the period (`:82-96`). `describeCadence` and `trackingSummary` give plain text (`:98-110`). Result schema `{ at, period, issues }` (`:22-34`).

## Server (`src/lib/admin/server/compliance/tracking.ts`)
Settings keys: `compliance.tracking.cadence`, `compliance.tracking.last`, `compliance.tracking.vendor_on_file`, and the cron slot `agents.compliance.tracking_slot` (`:18-22`).
- `trackingState` validates all three (bad values give `off` / null) (`:24-38`).
- `loadTrackingFacts`: banner on, privacy policy URL present, pixel listed (name, provider or purpose contains a pixel domain), vendor date (`:40-53`).
- `trackingDueNow(now, local?)`: null when off; otherwise the open period on the store's local clock if no result is saved for it yet (`:55-65`).
- `runTrackingCheck(now, period, runId)`: saves the result (a manual run keeps the scheduled period) and writes an AI activity log entry `compliance.tracking_check` (`:67-91`).
- `setTrackingCadence` and `markVendorOnFile` (owner actions, both logged; the latter also drops a saved `vendor_details` issue at once) (`:93-127`).

## Callers
- Compliance function run: `runTrackingCheck` when the trigger is `manual` or a period is due, and the summary is appended to the draft-check summary (`src/lib/admin/server/ai-functions.ts:264-277`).
- Scheduler: when `trackingDueNow(now, local)` gives a period, `claimAndRun('compliance', TRACKING_SLOT_SETTING, '<period>T<hour>', now)` (`ai-functions.ts:782-786`).
- Re-exported from `src/lib/admin/server/compliance.ts:36-42`; the Compliance page loads `trackingState` and `describeCadence` (`src/routes/admin/compliance/+page.server.ts:21`, `:29-35`, `:69-72`).

## Tests (not run here)
`src/lib/admin/compliance/tracking.test.ts` (titles not read).
