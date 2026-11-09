---
type: entity
title: "Storefront consent wiring and the visitor ID pixel: consent-manager.svelte.ts, visitor-pixel.ts, (store) layout"
entity_type: module
status: developing
created: 2026-11-04
updated: 2026-11-04
path: "src/lib/storefront/visitor-pixel.ts"
language: ts
depends_on: ["consent-ui-i18n.md", "consent-manager-signals.md", "consent-core-contract.md", "server-consent-state-record.md"]
used_by: ["compliance-tracking.md", "privacy-requests.md"]
last_commit_hash: "89960fc"
partial_scan: true
tested_by: ["src/lib/storefront/visitor-pixel.test.ts"]
tags: ["entity", "storefront", "consent", "pixel", "csp", "posthog"]
related: ["../admin-routes/src-routes-store-layout.md"]
sources: ["src/lib/storefront/consent-manager.svelte.ts", "src/lib/storefront/visitor-pixel.ts", "src/routes/(store)/+layout.svelte", "src/routes/(store)/+layout.server.ts", "vite.config.ts"]
---

# Storefront consent wiring and visitor ID pixel

## Overview
The store layout renders the Ecom Cookie banner from the server's per-request config, shares the started manager with other pages, gates PostHog identification on analytics consent, and loads a third-party visitor ID pixel only when marketing consent allows it. All files read in full at 89960fc except the layouts (cited lines only).

## Shared manager (`src/lib/storefront/consent-manager.svelte.ts`)
A `$state` holder `{ current: ConsentManager | null }` set by the store layout once the banner starts, so Your privacy choices and footer links can open the settings panel (`:1-7`).

## Layout integration
- Server: `clientConfigFor(event)` (errors give null) is returned as `consent`; an admin banner preview deletes the previous `eb_cc_preview` cookie so it always starts unanswered (`src/routes/(store)/+layout.server.ts:39`, `:95`, `:99-107`).
- Client: the banner gets the store's theme tokens (colours, radius, button radius, body font), with the owner's Privacy & cookies theme values winning (`src/routes/(store)/+layout.svelte:58-80`). `<CookieConsent config posthog onready>` renders only when a config exists; PostHog is passed only when its public token and host are set (`:22`, `:183-187`).
- `consentReady` stores the manager, tracks `analyticsAllowed`, and checks the pixel now and on every change (`:25-38`). PostHog `identify` runs for a signed-in customer only when analytics is allowed (`:40-52`).

## Visitor ID pixel (`src/lib/storefront/visitor-pixel.ts`)
- `VISITOR_PIXEL_SRC`: a vendor script URL on `px.lspxl.com` with an account path (`https://px.lspxl.com/c/<uuid>`) (`:6`). `VISITOR_PIXEL_CSP` lists the vendor's script, style and connect hosts (`:8-19`); `vite.config.ts` spreads them into the store's Content-Security-Policy (`vite.config.ts:8`, `:52`, `:58`, `:68`). `VISITOR_PIXEL_DOMAINS` (`lspxl.com`, `lgncmp.com`) let the compliance check find it in the cookie list (`:21-22`).
- `ALL_PARTY_CONSENT_STATES`: CA, CT, DE, FL, IL, MD, MA, MT, NV, NH, PA, WA, last checked `2026-11-03` (`:24-29`).
- `needsExplicitClick(country, region)`: unknown country, any US visitor without a state, or a listed state need an explicit click; other non-US countries do not (`:31-38`).
- `mayLoadVisitorPixel(state, place, now)`: needs `grants.marketing`; where an explicit click is needed, also a current stored choice with marketing on whose action is `accept_all`, or `custom` made in mode `opt-in` (`:40-51`). The comment explains that opt-out panels start switched on, so a "custom" there is not an active choice (`:49`).
- `loadVisitorPixel(doc)` appends one async script marked `data-visitor-pixel`; a withdrawal takes effect on the next page load (`:53-62`).

## Tests (not run here)
`src/lib/storefront/visitor-pixel.test.ts` (checks at least that the CSP script list contains the pixel origin, `:89`).
