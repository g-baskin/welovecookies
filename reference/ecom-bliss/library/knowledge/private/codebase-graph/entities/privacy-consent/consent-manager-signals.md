---
type: entity
title: "Ecom Cookie manager, vendor signals, auto-clear, standalone script and build: consent.ts, signals.ts, autoclear.ts, standalone.ts, tools/build-consent.mjs"
entity_type: service
status: developing
created: 2026-11-04
updated: 2026-11-04
path: "src/lib/consent/consent.ts"
language: ts
depends_on: ["consent-core-contract.md", "consent-ui-i18n.md"]
used_by: ["storefront-consent-visitor-pixel.md", "consent-api-routes.md"]
last_commit_hash: "89960fc"
partial_scan: true
tested_by: ["src/lib/consent/consent.test.ts", "src/lib/consent/signals.test.ts", "src/lib/consent/autoclear.test.ts", "src/lib/consent/standalone.test.ts"]
tags: ["entity", "consent", "ecom-cookie", "google-consent-mode", "posthog", "build"]
related: ["consent-core-contract.md", "server-consent-settings-sites.md"]
sources: ["src/lib/consent/consent.ts", "src/lib/consent/signals.ts", "src/lib/consent/autoclear.ts", "src/lib/consent/standalone.ts", "tools/build-consent.mjs", "src/lib/consent/README.md"]
---

# Ecom Cookie manager and signals

## Overview
`createConsent(config, options)` resolves the mode, reads and writes the choice cookie, sends consent signals to ad and analytics vendors, shows the UI and logs choices; it never throws into the page and never blocks the UI on the network (`src/lib/consent/consent.ts:1-4`, `:96-103`). If setup throws, a no-op manager is returned (`:80-84`, `:100-101`). All five files read in full at 89960fc, except `autoclear.ts:60-93` (domain and deletion-string helpers) skimmed.

## Manager API (`consent.ts:32-50`)
`get()` gives `{ mode, grants, stored, gpc, lang, device }`; `onChange(cb)` returns an unsubscribe; `acceptAll`, `rejectAll`, `save(grants)`, `acknowledge`, `openPreferences`, `showBanner`, `destroy`. Every method is wrapped so errors are logged as `[ecom-cookie]` and swallowed (`:86-94`, `:279-313`).

## Start-up order
1. Mode is `config.mode`, or a time-zone guess for `auto` (`:112-119`). GPC is `config.gpc` or `navigator.globalPrivacyControl` (`:121`). Language, device, path, compact mode (path prefix in `compactOn`) (`:122-125`).
2. The newest valid copy of the choice cookie is read and effective grants computed (`:130-131`).
3. Signals are applied before any vendor tag runs: `applyDefaults` with the mode defaults (marketing off under GPC), then `applyGrants` (PostHog left pending when there is no choice in an opt-in mode), then auto-clear (`:315-327`).
4. The UI mounts when `<body>` exists (or on `DOMContentLoaded`) (`:329-355`). With GPC in an opt-out mode and no choice, a silent `gpc` choice is saved as proof; otherwise `bannerFor` decides the banner and the floating button shows when a current choice exists (`:344-351`, `:204-207`).

## Making a choice (`choose`, `:209-262`)
GPC forces marketing off (`:211`). Turning everything off after having allowed something with a stored choice becomes `withdraw` (`:212-214`). The consent id is kept across choices (`:216`). The cookie is written, the panel and banner close, a "saved" toast shows except for OK (`:223-229`). Then, deferred: vendor signals, auto-clear, the `ecom-cookie:change` event, and a POST of `ConsentRecordPayload` to `endpoints.record` (`:230-246`). If the server answers a different `consent` with the same id, the manager adopts it, rewrites the cookie and re-applies signals (`:246-260`). The seen beacon is posted once per page load when a banner shows (`:265-277`).

POSTs: same origin uses `keepalive` and `credentials: same-origin`; other origins use CORS with `credentials: omit` and no keepalive (`:143-159`). Cookie domain `auto` probes root-domain candidates with a `<name>_probe` cookie; a domain write first removes a host-only copy; max age from the mode; `Secure` on https (`:160-190`).

## Vendor signals (`signals.ts`)
Never imports vendor SDKs; every call is guarded (`:1-4`, `:37-44`). Google Consent Mode v2: `ad_storage`, `ad_user_data`, `ad_personalization` follow marketing, `analytics_storage` follows analytics, `personalization_storage` follows preferences, functionality and security always granted (`:46-56`); `consent default` with `wait_for_update: 500` at start, creating `dataLayer`/`gtag` when missing (`:58-81`). Microsoft UET `ad_storage`; TikTok `holdConsent` at start (`:82-88`). On apply: Meta `fbq('consent', grant|revoke)`, TikTok grant/revoke, PostHog, a `dataLayer` event `ecom_cookie_update`, and script unblocking (`:98-124`). `applyPostHog` opts in on analytics, else `reset()` plus `opt_out_capturing()` if it had opted in (`:126-135`). `activateScripts` clones `<script type="text/plain" data-consent=...>` once all its categories are allowed, never twice (`:137-159`).

## Auto-clear (`autoclear.ts`)
Built-in name patterns: analytics (Google Analytics, PostHog `ph_*`, Clarity, Hotjar, Matomo, Mixpanel, Segment) and marketing (Meta, TikTok, Google Ads, Microsoft Ads, Pinterest, Snap, Reddit, LinkedIn); preferences has none (`:8-30`). A trailing `*` is a prefix (`:32-35`). For off categories, matching cookies (never the choice cookie) are deleted for the current and root paths and every parent domain, plus matching localStorage and sessionStorage keys (`:42-48`, `:111-139`).

## Standalone script (`standalone.ts`)
Sets `window.EcomCookie` with `init(config?)`, which merges defaults (`mode: auto`, `rev: 1`, floating button), the script tag's `data-*` attributes, `window.EcomCookieConfig` and the argument (`:77-92`, `:56-72`). With `data-site`, Google Consent Mode and UET default to denied at once (`hostedDefaults`, `:51-54`), then `loadHosted` fetches `/api/consent/config?site=` from the script's own host with `credentials: omit`; any failure falls back to `auto` mode without logging (`:26-49`, `:95-101`). `data-auto="false"` skips auto-init (`:100-104`).

## Build (`tools/build-consent.mjs`)
Runs the local `esbuild` binary to bundle `standalone.ts` as an IIFE to `static/consent/ecom-cookie.min.js` and `index.ts` as ESM to `static/consent/ecom-cookie.mjs`, minified for es2019, then prints min and gzip sizes (`:1-33`). It is run by hand (`node tools/build-consent.mjs`, `README.md:21-23`); whether any npm script calls it was not checked (unverified).

## Tests (not run here)
`consent.test.ts`, `signals.test.ts`, `autoclear.test.ts`, `standalone.test.ts` under `src/lib/consent/` (titles not read).

## Related
[contract](consent-core-contract.md) · [UI](consent-ui-i18n.md) · [storefront wiring](storefront-consent-visitor-pixel.md) · [hosted config endpoint](consent-api-routes.md)
