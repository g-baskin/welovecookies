---
type: entity
title: "Ecom Cookie endpoints: POST/OPTIONS /api/consent, GET/OPTIONS /api/consent/config, POST/OPTIONS /api/consent/seen"
entity_type: module
status: developing
created: 2026-11-04
updated: 2026-11-04
path: "src/routes/api/consent/"
language: ts
depends_on: ["server-consent-state-record.md", "server-consent-settings-sites.md", "consent-core-contract.md"]
used_by: ["consent-manager-signals.md", "privacy-requests.md"]
last_commit_hash: "89960fc"
partial_scan: true
tested_by: ["src/routes/api/consent/consent-api.test.ts", "src/routes/api/consent/sites-api.test.ts"]
tags: ["entity", "consent", "ecom-cookie", "api", "cors"]
related: ["../ads/server-ads-attribution-consent.md"]
sources: ["src/routes/api/consent/+server.ts", "src/routes/api/consent/config/+server.ts", "src/routes/api/consent/seen/+server.ts"]
---

# Consent API routes

> [!stale]
> Prior claim (4ddb7b9, recorded on the [attribution page](../ads/server-ads-attribution-consent.md)), now false: `POST /api/consent` took only `{ choice }`, was same-origin only and answered `{ ok, choice }`. See [contradiction report](../../meta/2026-11-04-contradiction-report-g6b.md), entry 2.

> [!contradiction]
> `POST /api/consent` changed contract since 4ddb7b9, where it accepted only `{ choice }`, required `Origin` equal to the store origin (403 otherwise) and answered `{ ok, choice }` (prior claim on [attribution page](../ads/server-ads-attribution-consent.md)). Now it also accepts the banner's JSON `ConsentRecordPayload`, accepts cross-origin JSON from registered websites, and answers with `consent` (below). Introduced in `1f676e9` and `e8d3cff` (2026-11-03). See [contradiction report](../../meta/2026-11-04-contradiction-report-g6b.md), entry 2.

## Overview
Three endpoints for the Ecom Cookie banner. Same-origin requests come from the store; cross-origin requests are allowed only from a registered website's exact origin, with CORS and no credentials, and never set a cookie (`src/routes/api/consent/+server.ts:1-7`). All three files read in full at 89960fc.

## POST /api/consent (`+server.ts:57-130`)
- A form post whose `Origin` is not the store origin gets 403 (`:59-61`). Body is form data or JSON (`:62-64`).
- **Other website** (`Origin` differs): `siteForRequest(body.site, origin)` must pass, else 403; the body must match `payloadSchema` (`:28-40`), else 400 with CORS headers; `recordChoice` with `site` set; reply `{ ok: true, consent }` with CORS headers (`:66-85`).
- **Legacy `choice`** (Your privacy choices page, works without JavaScript): `accept`, `decline`, `optout`, `optin`, else 400 (`:42-43`, `:87-91`). `accept` and `optin` record `accept_all` with every category; `decline` records `reject_all`; `optout` records `custom` with the current grants and marketing off (`:92-106`). `recordChoice(..., setCookie: true)` writes `eb_cc` host-only (`:107-108`). Forms redirect 303 to the same-origin `landing` path and query, else `/` (`:110-113`); JSON gets `{ ok, choice: granted|denied|optout, consent }` (`:109`, `:114`).
- **Banner JSON**: `payloadSchema` (client `mode` is informational only, never trusted, `:32`); `recordChoice` with the page path and the same-origin landing URL (or the page) for ad capture; reply `{ ok: true, consent }` (`:117-129`).
- `pathOf` keeps the path only and only for the given origin (`:45-55`).

## OPTIONS (all three routes)
403 unless an enabled site has this `Origin`; otherwise 204 with `preflightHeaders` for `POST` (`+server.ts:132-136`, `seen/+server.ts:56-60`) or `GET` (`config/+server.ts:61-65`).

## GET /api/consent/config?site=<key> (`config/+server.ts:22-59`)
The hosted install's config. `siteForRequest` failure answers 404 "Unknown website." or 403 "Not allowed." with `cache-control: private, no-store` (`:19`, `:24-30`). Banner off gives 404 (`:34`). The state is computed with no cookies so the store's cookies are never read (`:20`, `:35-38`). The config uses the store's settings, the site's own cookie list when it has one, the site's privacy link, absolute record and seen endpoints on the store, `cookieDomain: 'auto'` and the site key (`:39-57`).

## POST /api/consent/seen (`seen/+server.ts:28-54`)
Cookieless count of a banner view (`:1-6`). Cross-origin needs a valid site (403 otherwise) (`:34-40`); a bad body gets 400 (`:41-42`); when `shouldCount` passes, bumps `seen` in `consent_daily` or `consent_site_daily` by the server's mode and country and the client's device (`:43-49`). Errors are logged; the reply is 204 (`:50-53`). The file comment says "Always answers 204" (`:3`), but 400 and 403 are also returned.

## Tests (not run here)
`src/routes/api/consent/consent-api.test.ts`, `src/routes/api/consent/sites-api.test.ts` (titles not read).
