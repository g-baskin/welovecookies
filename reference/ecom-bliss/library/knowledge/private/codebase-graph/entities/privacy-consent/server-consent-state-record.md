---
type: entity
title: "Ecom Cookie server state, choice recording and proof-of-consent log: state.ts, record.ts, log.ts, schema/consent.ts"
entity_type: service
status: developing
created: 2026-11-04
updated: 2026-11-04
path: "src/lib/server/consent/state.ts"
language: ts
depends_on: ["consent-core-contract.md", "server-consent-settings-sites.md", "../ads/server-ads-attribution-consent.md", "../server-core/settings.md"]
used_by: ["consent-api-routes.md", "privacy-requests.md", "admin-privacy-routes.md", "storefront-consent-visitor-pixel.md", "compliance-tracking.md", "../ads/server-ads-attribution-consent.md"]
last_commit_hash: "89960fc"
partial_scan: true
tested_by: ["src/lib/server/consent/consent.test.ts"]
tags: ["entity", "consent", "ecom-cookie", "d1", "proof-of-consent", "gpc"]
related: ["../ads/ads-overview.md"]
sources: ["src/lib/server/consent/state.ts", "src/lib/server/consent/record.ts", "src/lib/server/consent/log.ts", "src/lib/server/db/schema/consent.ts"]
---

# Server consent state, recording and log

## Overview
The server side of Ecom Cookie: what one storefront request may do (`consentRequestState`), the per-request browser config (`clientConfigFor`), saving a shopper's choice (`recordChoice`) and the proof-of-consent log in D1. The server decides the region mode, never the client (`src/lib/server/consent/record.ts:1-4`). No IP address is ever stored (`src/lib/server/db/schema/consent.ts:1-4`). All four files read in full at 89960fc.

## Request state (`state.ts`)
`consentRequestState(event, { settings?, now? })` (`:115-143`) returns `ConsentRequestState` (`:31-44`):
- `country` from `countryOf` in attribution.ts and `regionCode` from `platform.cf.regionCode` (1-3 alphanumerics) (`:46-50`, `:121-122`); `mode = modeFor(country, regionCode, optInCountries(now))` (`:123`); `gpc` is `Sec-GPC: 1` (`:124`); `rev` from the settings (`:125`).
- `stored`: the newest `eb_cc` among every copy in the `Cookie` header, else SvelteKit's single value (`newestConsent`, `:80-96`). Without one, the old `eb_consent` is read as a choice made now: `granted` and `denied` become accept/reject in an opt-in mode, `optout` becomes custom with marketing off; `legacy` is then true (`:52-78`, `:127-131`).
- `grants` from `effectiveGrants`, `banner` from `bannerFor` with the owner's notice-banner flags (`:139-140`).

`consentPreviewFor`: `?consent_preview=<mode>` (and `consent_lang`) only for a signed-in admin session (`:145-158`). `privacyPolicyUrl` is `/pages/privacy` when a published policy page has handle `privacy` (`:160-168`).

`clientConfigFor(event, now)` (`:174-210`): null when the owner turned the banner off and this is not a preview (`:185`). Otherwise mode (preview mode wins), country, region, GPC, `rev`, texts, theme, position, preferences category, floating button, notice flags, the cookie list with default labels, links (privacy policy when published, `privacyChoices: /privacy-choices`), endpoints `/api/consent` and `/api/consent/seen` (none in a preview), cookie name `eb_cc` (or `eb_cc_preview` in a preview), integrations, store logo and name when `showLogo` (`bannerBrand`, `:98-113`), `compactOn: ['/checkout', '/cart']` and `avoidSelector: '[data-sticky-cta]'` (`:188-209`; constants `:170-172`).

## Recording a choice (`record.ts`)
`recordChoice(event, input, now)` (`:43-99`), input `ChoiceInput` (`:24-41`):
1. Recomputes the request state; GPC turns marketing off; builds `StoredConsent` with a valid or new id, the server's mode and rev (`:48-57`).
2. Cookies: other websites (`site`) never touch this store's cookies; `setCookie` (no-JavaScript form path) writes `eb_cc` host-only; otherwise only the legacy `eb_consent` is deleted, because the banner script writes `eb_cc` itself (`:58-62`).
3. Ad visit: when marketing is allowed and the landing URL is same-origin, `captureLanding` keeps it; in opt-in modes without marketing `eb_attr` is deleted; never for other websites (`:63-70`).
4. Log: inserts one `consent_records` row with the signed-in customer id (store only); if `shouldCount` passes, bumps the daily counter for the action, plus `gpc` when GPC forced it (`:71-94`). Any logging error is caught and printed; the choice is still returned (`:95-98`).

## Log helpers (`log.ts`)
- Retention 5 years plus two days (`:22-24`); metrics `seen` plus the six actions (`:26-35`).
- `deviceOf(userAgent)` server guess (`:37-43`). `bumpConsentDaily` / `bumpConsentSiteDaily` upsert `count + 1` on the full key (`:45-81`).
- `writeConsentCookie`: `eb_cc`, `httpOnly: false` so the banner can read it, `sameSite: lax`, secure on https, max age from the mode; deletes `eb_consent` (`:88-101`). `clearLegacyConsentCookie` (`:83-86`). `validConsentId` (`:103-104`).
- `insertConsentRecord` clips `lang` to 12, `page` and user agent to 200 (`:120-145`). `purgeOldConsent` deletes records and both counter tables older than the retention cut-off (`:147-160`); it is called when the admin opens the Records tab (see [admin privacy](admin-privacy-routes.md)).

## D1 tables (`src/lib/server/db/schema/consent.ts`)

| Table | Key | Columns | Line |
|---|---|---|---|
| `consent_records` | `id` | consent_id, created_at, action, preferences/analytics/marketing (0/1), mode, country, region_code, rev, lang, device, gpc, page, user_agent, customer_id, site (`''` = this store) | `:7-34` |
| `consent_daily` | (day, metric, mode, country, device) | count | `:36-47` |
| `consent_versions` | `rev` | created_at, texts_json, cookies_json | `:49-54` |
| `consent_sites` | `id` (public site key) | name, origin, privacy_url, cookies_json, enabled, created_at | `:56-68` |
| `consent_site_daily` | (day, site, metric, mode, country, device) | count | `:70-83` |
| `privacy_requests` | `id` | created_at, kind, status, email, name, message, consent_id, customer_id, country, region_code, due_at, closed_at, note, site | `:85-111` |

Indexes: `consent_records` on consent id and created time; `privacy_requests` on created time and status (`:30-33`, `:107-110`). Migrations: `migrations/0034_consent_records.sql` creates `consent_daily`, `consent_records` and `consent_versions` (`:1`, `:11`, `:33`); `migrations/0037_consent_sites_privacy_requests.sql` creates `consent_site_daily`, `consent_sites` and `privacy_requests` (`:1`, `:12`, `:22`).

## Tests (not run here)
`src/lib/server/consent/consent.test.ts` (titles not read).

## Related
[contract](consent-core-contract.md) · [settings and sites](server-consent-settings-sites.md) · [API routes](consent-api-routes.md) · [ads view](../ads/server-ads-attribution-consent.md)
