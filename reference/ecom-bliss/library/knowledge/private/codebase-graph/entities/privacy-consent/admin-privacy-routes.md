---
type: entity
title: "Admin Privacy & cookies pages: /admin/privacy (tabs), records.csv, requests, requests/[id], sites, plus display.ts, records.ts, PrivacyHeader.svelte"
entity_type: module
status: developing
created: 2026-11-04
updated: 2026-11-04
path: "src/routes/admin/privacy/"
language: ts
depends_on: ["server-consent-state-record.md", "server-consent-settings-sites.md", "privacy-requests.md", "consent-core-contract.md"]
used_by: []
last_commit_hash: "89960fc"
partial_scan: true
tested_by: ["src/routes/admin/privacy/privacy-pages.test.ts", "src/routes/admin/privacy/requests/requests-pages.test.ts", "src/routes/admin/privacy/sites/sites-page.test.ts", "src/lib/admin/privacy/display.test.ts"]
tags: ["entity", "admin", "privacy", "consent", "csv"]
related: ["../ads/admin-ads-routes.md"]
sources: ["src/routes/admin/privacy/+page.server.ts", "src/routes/admin/privacy/+page.svelte", "src/routes/admin/privacy/records.csv/+server.ts", "src/routes/admin/privacy/requests/+page.server.ts", "src/routes/admin/privacy/requests/+page.svelte", "src/routes/admin/privacy/requests/[id]/+page.server.ts", "src/routes/admin/privacy/requests/[id]/+page.svelte", "src/routes/admin/privacy/requests/[id]/account/+server.ts", "src/routes/admin/privacy/sites/+page.server.ts", "src/routes/admin/privacy/sites/+page.svelte", "src/lib/admin/privacy/display.ts", "src/lib/admin/privacy/records.ts", "src/lib/admin/privacy/PrivacyHeader.svelte"]
---

# Admin Privacy & cookies

## Overview
The owner's area for the cookie banner, proof-of-consent records, shopper privacy requests and other websites. Every load requires `locals.adminId` (401 otherwise) and sends `cache-control: private, no-store`; every write action first calls `rejectAdminWrite` (`src/routes/admin/privacy/+page.server.ts:3`, `:87`), which answers `fail(401)` without `locals.adminId` and `fail(403)` when the `Origin` header is not the store origin, else `null` (`src/lib/admin/server/admin-write.ts:7-16`). It does not check the owner role; that is `rejectOwnerAction` in `src/lib/admin/server/owner-guard.ts:9-19`. The requests and sites pages use the same guard (`src/routes/admin/privacy/requests/+page.server.ts:30`, `src/routes/admin/privacy/sites/+page.server.ts:46`, `:79`). Server files and `records.ts`, `PrivacyHeader.svelte` read in full; `display.ts` read at `:1-175`; the `.svelte` pages searched for forms and links only.

## Tabs (`src/lib/admin/privacy/PrivacyHeader.svelte`)
Title "Privacy & cookies"; tabs Overview, Banner, Cookies, Records (query `?tab=` on `/admin/privacy`), Requests (with the open count) and Other websites (`:6-29`).

## /admin/privacy (`+page.server.ts`)
`load` (`:28-74`): tab from `PRIVACY_TABS`, period 7/30/90 days (default 30), banner language, optional consent id lookup (`:31-40`). Opening Records first runs `purgeOldConsent` (`:42`). Overview uses `readOverview(days, now, site)` for this store or one website (`:48-50`, `:62`); Records uses `readRecords` (latest 100, or every row for a valid consent id) with a website label per row (`:51-54`, `:68-71`).

Actions:
- `banner` (`:86-126`): per-language wording overrides for `EDITABLE_TEXTS` (empty field removes the override), "use store theme" or four colours, on/off, position, floating button, logo, Preferences category, notice banner flags. Saved through `saveConsentSettings`, which bumps `rev` when wording or categories change (`:79-83`).
- `askAgain` (`:127-135`): forces a new `rev`; message says every visitor sees the banner again.
- `cookies` (`:136-162`): rebuilds the list from indexed form rows up to 200, skipping removed and empty rows; each row needs a category, name, provider, purpose and duration (400 otherwise).
- `resetCookies` (`:163-167`): restores `DEFAULT_COOKIES`.
Forms in the page: `?/banner`, `?/askAgain`, `?/cookies`, `?/resetCookies`, and a GET form to `records.csv` (`+page.svelte:170`, `:324`, `:336`, `:402`, `:429`).

## records.csv (`records.csv/+server.ts`)
GET with `from` and `to` as `YYYY-MM-DD` (400 otherwise), UTC days inclusive; up to 50,000 rows from `recordsBetween` (`:17-28`; `records.ts:109-116`). Plain-word columns (choice, categories, rules that applied, place, banner version, language, device, browser privacy signal, page, browser name, signed-in customer email, website) (`:33-70`). Served as an attachment, `private, no-store` (`:71-77`). No IP addresses exist to export (`:19`).

## Overview numbers (`src/lib/admin/privacy/records.ts`, `display.ts`)
`readOverview` sums the daily counters (store or site table) and, from the log, how many banner answers (`accept_all`, `reject_all`, `custom`) allowed analytics or marketing (`records.ts:8-67`). `summarize` groups by region group (Asks first / Lets people opt out / Notice only), device and top 10 countries (`display.ts:50-76`, `:135-170`). Plain labels for actions and modes (`display.ts:78-94`). `withEmail` joins the customer email instead of showing an id (`records.ts:71-98`).

## Requests (`requests/`)
- List `load`: filter `open` (default), `done`, `all` (`requests/+page.server.ts:13-26`). `save` action: status from the form (`working` maps to `in_progress`), note; 400 on an unknown status, 404 when the request is gone (`:28-41`). Each row links to "Their account" (`requests/+page.svelte:114`).
- `requests/[id]`: `dataSummary` for the request; 404 when missing; the customer id is removed from the page data (`[id]/+page.server.ts:5-18`). The page has a Print button (`[id]/+page.svelte:28`).
- `requests/[id]/account`: GET redirects 303 to `/admin/customers/<id>` when the request has a linked customer, else 404, so the id never appears in the list page (`[id]/account/+server.ts:1-16`).

## Other websites (`sites/+page.server.ts`)
`load` lists sites with host, privacy link, on/off, 30-day records and the install snippet `<script src="<store>/consent/ecom-cookie.min.js" data-site="<key>" async>` (`:17-34`). Actions: `add` validates with `newSiteSchema`, refuses the store's own origin and duplicates, inserts with a new site key (`:45-77`); `toggle` switches the banner on or off for a site, keeping records (`:78-94`); `remove` deletes the site row, records kept and shown as "Removed website" (`:95-104`).

## Tests (not run here)
`privacy-pages.test.ts`, `requests/requests-pages.test.ts`, `sites/sites-page.test.ts` under `src/routes/admin/privacy/`, and `src/lib/admin/privacy/display.test.ts` (titles not read).
