---
type: entity
title: "Ecom Cookie shared contract: types.ts, cookie.ts, regions.ts, device.ts, index.ts"
entity_type: module
status: developing
created: 2026-11-04
updated: 2026-11-04
path: "src/lib/consent/"
language: ts
depends_on: []
used_by: ["consent-manager-signals.md", "consent-ui-i18n.md", "server-consent-state-record.md", "server-consent-settings-sites.md", "consent-api-routes.md", "storefront-consent-visitor-pixel.md", "../ads/server-ads-attribution-consent.md"]
last_commit_hash: "89960fc"
partial_scan: true
tested_by: ["src/lib/consent/contract.test.ts", "src/lib/consent/device.test.ts"]
tags: ["entity", "consent", "privacy", "ecom-cookie", "gpc"]
related: ["../ads/server-ads-attribution-consent.md"]
sources: ["src/lib/consent/types.ts", "src/lib/consent/cookie.ts", "src/lib/consent/regions.ts", "src/lib/consent/device.ts", "src/lib/consent/index.ts", "src/lib/consent/README.md"]
---

# Ecom Cookie shared contract

## Overview
Ecom Cookie is the store's framework-free cookie consent banner, preferences panel and consent manager; any other site can load it with one script tag, and the folder uses only relative imports so it can be copied whole (`src/lib/consent/README.md:1-3`). These five files are the contract shared by the browser core, the store server and the standalone script, and must change only additively (`src/lib/consent/types.ts:1-6`). The README and the code call the rules "engineering defaults, not legal advice" (`README.md:5`, `regions.ts:4`). All five files read in full at 89960fc.

## Vocabulary (`src/lib/consent/types.ts`)

| Export | Values | Line |
|---|---|---|
| `CONSENT_CATEGORIES`, `OPTIONAL_CATEGORIES` | `necessary` (always on, never stored), `preferences`, `analytics`, `marketing` | `:8-12` |
| `Grants`, `ALL_GRANTED`, `NONE_GRANTED` | booleans per optional category; `marketing` covers ad attribution and sharing with ad platforms | `:13-17` |
| `CONSENT_MODES` | `opt-in`, `opt-in-uk`, `opt-in-light`, `opt-out-gpc`, `opt-out`, `notice` | `:19-36` |
| `CONSENT_ACTIONS` | `accept_all`, `reject_all`, `custom`, `acknowledge`, `withdraw`, `gpc` | `:38-52` |
| `DEVICES` | `phone`, `tablet`, `desktop` | `:54-55` |
| `StoredConsent` | `{ id (16 url-safe chars), at, mode, rev, grants, action }` | `:57-69` |
| `ConsentRecordPayload` / `ConsentRecordResponse` | POST body to the record endpoint (page is path only; optional `site`, `landing`); reply `{ ok: true, consent }` the server may correct | `:71-94` |
| `ConsentSeenPayload` | `{ mode, device, lang, site? }` cookieless count | `:96-103` |
| `HOSTED_CONFIG_PATH` | `/api/consent/config` | `:105-111` |
| `PRIVACY_REQUEST_KINDS`, `PRIVACY_REQUEST_STATUSES` | `delete`, `copy`, `correct`, `stop_selling`; `new`, `in_progress`, `done`, `declined` | `:113-117` |
| `CookieInfo`, `ConsentTexts`, `ConsentTextOverrides`, `ConsentTheme` | cookie list row (plain `name`, optional `label`), every visible string, owner overrides, CSS values | `:119-187` |
| `BANNER_POSITIONS` | `auto`, `bottom-left`, `bottom-right`, `bottom-center`; phones always get a bottom sheet | `:189-194` |
| `ConsentIntegrations` | `googleConsentMode`, `microsoftUet`, `meta`, `tiktok`, `posthog`, `scriptBlocking` | `:196-209` |
| `ConsentConfig` | everything the browser core needs; built per request by the server | `:211-259` |
| `CONSENT_COOKIE_NAME`, `LEGACY_CONSENT_COOKIE` | `eb_cc`; old ads-only `eb_consent` read as a fallback only | `:261-264` |

## Cookie wire format (`src/lib/consent/cookie.ts`)
`1.<id>.<at base36>.<rev>.<mode code>.<p a m bits>.<action code>` (`:1-5`). Mode codes `i u l g o n` and action codes `a r c k w g` (`:14-29`). `newConsentId` makes 12 random bytes into 16 url-safe characters (`:37-44`); `CONSENT_ID_RE` is `^[A-Za-z0-9_-]{16}$` (`:35`). `decodeConsent` rejects anything over 80 chars, wrong part count or version, and re-validates every field, so malformed values read as "no choice" (`:59-77`). `readCookies` returns every copy of a name and `newestConsent` keeps the highest `at` (`:93-111`).

## Region modes (`src/lib/consent/regions.ts`)
Sources are recorded in `library/knowledge/private/privacy/consent-law-matrix.md` (`:3`; that file was not opened in this pass).
- `COUNTRY_MODES`: EU/EEA (including IS, LI, NO) `opt-in`; `GB` `opt-in-uk`; `CH` `opt-in` by store choice; `CA` `opt-out`; others such as BR, CN, KR, TH, VN, NG, TR, SA `opt-in`; MX, AR, CL, CO, IN, SG, ID, PH, ZA, KE, AE, IL `opt-in-light`; JP, AU, NZ `notice` (`:14-32`). `CA-QC` is `opt-in` (`:34-35`).
- US states: 12 states `opt-out-gpc`, 8 states `opt-out`, unlisted states and DC `notice`; a US visitor without a state is `opt-out-gpc` (`:37-51`). Unknown or unlisted country is `opt-in` (`:52-53`).
- `modeFor(country, regionCode, forceOptIn)`: invalid or `XX`/`T1` country gives the default; the owner's force list wins; then region override, US state table, country table (`:55-80`).
- `MODE_RULES`: the three opt-in modes share one rule (full banner, nothing granted, ask again after 180 days); `opt-out-gpc` and `opt-out` show a notice with a Do Not Sell link, everything granted by default, 365 days (only `opt-out-gpc` has `gpcRequired`); `notice` shows no banner, 365 days (`:82-133`).
- `isCurrent`: same or newer `rev`, younger than its mode's max age, and not dated more than a day ahead (`:137-141`).
- `effectiveGrants`: a current choice counts only if made under an equally strict mode (moving into an opt-in region asks again); otherwise the mode defaults; GPC always turns marketing off (`:143-158`).
- `bannerFor`: opt-in gives `full` until a usable choice exists; otherwise `notice` per the owner's `noticeBanner` flags (opt-out default on, notice default off) (`:160-177`).
- `modeFromTimeZone`: the standalone `auto` guess from the IANA time zone, erring to opt-in (`:179-198`).

## Device (`src/lib/consent/device.ts`)
`deviceOf(width, userAgent, maxTouchPoints)`: under 600 px is a phone; tablet user agents (including iPadOS reporting a Mac UA with touch points) or touch screens up to 1366 px outside Windows/ChromeOS/Linux are tablets (`:4-14`). The server has its own user-agent-only `deviceOf` in `src/lib/server/consent/log.ts:38-43`.

## Barrel (`src/lib/consent/index.ts`)
Re-exports types, regions and cookie, plus `builtInTexts`, `isRtl`, `LANGUAGES`, `pickLanguage`, `textsFor`, `deviceOf`, the signal helpers and `createConsent` (`:1-19`). It is the ESM bundle entry in [consent build](consent-manager-signals.md).

## Tests (not run here)
`src/lib/consent/contract.test.ts`, `src/lib/consent/device.test.ts` (titles not read).

## Related
[manager and signals](consent-manager-signals.md) · [UI and texts](consent-ui-i18n.md) · [server state](server-consent-state-record.md) · [ads view of consent](../ads/server-ads-attribution-consent.md)
