---
type: entity
title: "Shopper privacy requests and Your privacy choices page: server/privacy/requests.ts, summary.ts, requests-display.ts, (store)/privacy-choices"
entity_type: service
status: developing
created: 2026-11-04
updated: 2026-11-04
path: "src/lib/server/privacy/requests.ts"
language: ts
depends_on: ["server-consent-state-record.md", "server-consent-settings-sites.md", "consent-core-contract.md", "../ads/server-ads-attribution-consent.md"]
used_by: ["admin-privacy-routes.md"]
last_commit_hash: "89960fc"
partial_scan: true
tested_by: ["src/lib/server/privacy/requests.test.ts", "src/routes/(store)/privacy-choices/privacy-request.test.ts", "src/routes/admin/ads/ads-pages.test.ts"]
tags: ["entity", "privacy", "privacy-requests", "storefront", "email"]
related: ["consent-api-routes.md", "storefront-consent-visitor-pixel.md"]
sources: ["src/lib/server/privacy/requests.ts", "src/lib/server/privacy/summary.ts", "src/lib/admin/privacy/requests-display.ts", "src/routes/(store)/privacy-choices/+page.server.ts", "src/routes/(store)/privacy-choices/+page.svelte"]
---

# Privacy requests and Your privacy choices

## Overview
Shoppers can ask the store to delete their data, send a copy, correct it, or stop selling/sharing it. Requests never store an IP address and never change customer data by themselves (`src/lib/server/privacy/requests.ts:1-4`). The owner works them in Admin, Privacy & cookies, Requests ([admin privacy](admin-privacy-routes.md)). `requests.ts`, `summary.ts`, `requests-display.ts` and the page server read in full; the page component searched for forms and data use only.

## Requests (`requests.ts`)
- `dueDaysFor(country)`: Brazil 15 days, US 45, everyone else 30 (`:24-30`).
- `requestFormSchema`: kind, lower-cased email up to 254, name up to 120, message up to 1000, each with a plain error (`:32-46`).
- `createPrivacyRequest`: refuses when the same email already has 3 open requests in the last day (`DAILY_LIMIT`, `:21-22`, `:60-77`); inserts status `new` with `dueAt = now + dueDays` (`:78-95`).
- `notifyPrivacyRequest`: emails the owner (`store.email`, when set) a link to `/admin/privacy/requests`, and the shopper a receipt; idempotency keys per request; each email failure is logged and never throws (`:104-143`).
- `countOpenRequests` (`new` + `in_progress`) for the Requests tab count (`:145-153`). `listRequests('open'|'done'|'all')`: open sorted by due date, others newest first (`:155-169`).
- `updateRequest(id, status, note)`: closing stamps `closedAt` once, reopening clears it, note clipped to 2000; false when the id is unknown (`:174-190`).

## What we hold about them (`summary.ts`)
`dataSummary(requestId)` is read-only (`:1`). It finds the customer by the request's customer id, else by email (`:14-20`); orders by customer or email with item titles (`:21-41`); reviews by author email (`:42-55`); every request from that email (`:56-61`); consent records by the consent ids on those requests or the customer id (`:62-76`); de-duplicated addresses from the customer and orders (`:77-94`). Returns plain fields only (`:95-131`).

## Labels (`src/lib/admin/privacy/requests-display.ts`)
Plain kind and status labels, per-kind guidance for the owner (identity check except for stop selling), and `dueLabel` ("Due in 12 days", "Due today", "Overdue by 3 days", UTC calendar days) (`:4-38`). Also used for the email subject (`requests.ts:11`, `:110`).

## Your privacy choices (`src/routes/(store)/privacy-choices/`)
`load` (`+page.server.ts:26-47`): Ecom Cookie state plus the ads view (`region`, `consent` from `consentFor`, kept for callers, `:30-34`); `optIn`, `doNotSell` from the mode rule; `gpc`, current `grants`, whether a choice exists; the consent id and date only for a non-legacy choice; the cookie list with labels; the signed-in customer's email; reply days.

`request` action (`:49-84`): a filled hidden `website` field is a honeypot that pretends success and keeps nothing (`:62-63`); a signed-in shopper's account email replaces the typed one (`:61`, `:64`); validation errors give 400 and the daily limit gives 429 (`:65-69`, `:77`); the request carries the customer id when signed in, the consent id, country and region (`:70-76`); notification errors are ignored (`:78-81`).

Page (`+page.svelte`): shows a GPC notice (`:80-83`), "What is allowed right now", a Change cookie settings button that opens the banner panel through the shared manager (`:118-122`), and two no-JavaScript forms posting `choice` to `/api/consent`: `accept` or `optin`, and `decline` or `optout` with the Do Not Sell label where the mode asks for it (`:125-140`); the shopper's reference (consent id) with copy (`:61-62`, `:143-151`); the cookie list (`:161`); and the "Ask about your data" request form (`:204-216`).

## Tests (not run here)
`src/lib/server/privacy/requests.test.ts`, `src/routes/(store)/privacy-choices/privacy-request.test.ts`; `src/routes/admin/ads/ads-pages.test.ts:217` renders the page in both region types.
