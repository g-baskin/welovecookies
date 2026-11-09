---
type: entity
title: "Ecom Cookie owner settings and other websites: settings.ts, sites.ts"
entity_type: service
status: developing
created: 2026-11-04
updated: 2026-11-04
path: "src/lib/server/consent/settings.ts"
language: ts
depends_on: ["consent-core-contract.md", "../server-core/settings.md"]
used_by: ["server-consent-state-record.md", "consent-api-routes.md", "admin-privacy-routes.md", "compliance-tracking.md"]
last_commit_hash: "89960fc"
partial_scan: true
tested_by: ["src/lib/server/consent/consent.test.ts", "src/routes/api/consent/sites-api.test.ts", "src/routes/admin/privacy/sites/sites-page.test.ts"]
tags: ["entity", "consent", "ecom-cookie", "settings", "cors", "config-key"]
related: ["server-consent-state-record.md"]
sources: ["src/lib/server/consent/settings.ts", "src/lib/server/consent/sites.ts"]
---

# Consent settings and other websites

## Overview
`settings.ts` holds the owner's banner settings under setting key `consent.settings` and the banner versions log; saving wording, categories or cookie purposes bumps `rev` so visitors are asked again, and snapshots what was shown in `consent_versions` (`src/lib/server/consent/settings.ts:1-7`, `:18`). `sites.ts` manages other websites that use the store's banner; a site may load its config and send records only from its own exact origin (`src/lib/server/consent/sites.ts:1-5`). Both read in full at 89960fc.

## Settings schema (`settings.ts`)
`consentSettingsSchema` (`:102-116`): `enabled`, `rev` (1 to 999999), `position`, `floatingButton`, `preferencesCategory`, `noticeBanner { optOut, notice }`, `theme` (CSS values that reject `; { } < > \`, `:21-26`, `:75-88`), `texts` per language code or `*` (`LANG_RE`, `:99-100`; length caps `:30-64`), `cookies` (up to 200 `cookieInfoSchema` rows, `:66-73`), `integrations` (six booleans, `:90-97`), `showLogo`.

`DEFAULT_COOKIES` lists what the store really sets, checked Nov 2026: necessary `eb_cc`, `eb_cart`, `eb_customer`, `eb_wishlist`, Stripe fraud cookies; analytics PostHog `ph_*`; marketing `eb_attr`, Meta `_fbp, _fbc`, TikTok `_ttp`; admin-only cookies omitted; Preferences off by default because no preference cookies exist (`:118-197`). Defaults: banner on, rev 1, auto position, floating button on, notice banner in opt-out regions only, every integration on, logo shown (`:199-218`).

## Reading and saving
- `getConsentSettings` / `parseConsentSettings`: saved value merged over defaults; if the whole object fails, each valid field is kept and the rest defaulted (`:222-242`).
- `withCookieLabels`: rows saved before labels existed get the default label for the same name (`:248-256`).
- `saveConsentSettings(next, { askAgain })` ignores `rev` in `next`; bumps `rev` when `askAgain` or when texts, cookie rows (labels excluded) or the preferences category changed; snapshots the previous and new versions (`onConflictDoNothing`), then saves (`:244-246`, `:258-293`). Returns `{ ok: false, error }` with the first issue on bad input (`:281-283`).

## Other websites (`sites.ts`)
- Site key `ws_` + 12 url-safe characters from 12 random bytes mod 64 (`:14-23`).
- `normaliseWebsite`: adds `https://` when missing; rejects credentials, query, hash, any path, and hosts without a dot; returns `https://<host>` even for an `http:` input (`:25-41`). `newSiteSchema` validates name (1-80), address and an optional `https://` privacy link (`:46-77`).
- `siteForRequest(key, origin)`: 404 unless the key names an enabled site; 403 unless `Origin` equals the site's origin exactly (`:89-98`). `enabledSiteByOrigin` for preflights (`:100-109`).
- `corsHeaders(origin)`: `access-control-allow-origin` for that origin plus `vary: Origin`, never credentials; `preflightHeaders` adds methods, `content-type` header and a one-day max age (`:111-122`).
- `siteCookies` parses a site's own cookie list, else null (store list) (`:124-133`). `listSites` adds a 30-day record count per site (`:135-150`). `siteNames` and `websiteLabel` ("Removed website" for a deleted key) feed the records table and CSV (`:152-165`).

## Related
[server state](server-consent-state-record.md) · [API routes](consent-api-routes.md) · [admin pages](admin-privacy-routes.md)
