---
type: entity
title: "Ecom Cookie banner UI and texts: ui.ts, ui-css.ts, auto-hide.ts, i18n.ts, i18n/*.ts, svelte/CookieConsent.svelte"
entity_type: module
status: developing
created: 2026-11-04
updated: 2026-11-04
path: "src/lib/consent/ui.ts"
language: ts
depends_on: ["consent-core-contract.md"]
used_by: ["consent-manager-signals.md", "storefront-consent-visitor-pixel.md"]
last_commit_hash: "89960fc"
partial_scan: true
tested_by: ["src/lib/consent/auto-hide.test.ts", "src/lib/consent/i18n.test.ts"]
tags: ["entity", "consent", "ecom-cookie", "ui", "i18n", "accessibility"]
related: ["consent-manager-signals.md"]
sources: ["src/lib/consent/ui.ts", "src/lib/consent/ui-css.ts", "src/lib/consent/auto-hide.ts", "src/lib/consent/i18n.ts", "src/lib/consent/i18n/a.ts", "src/lib/consent/i18n/b.ts", "src/lib/consent/i18n/c.ts", "src/lib/consent/i18n/d.ts", "src/lib/consent/i18n/row.ts", "src/lib/consent/svelte/CookieConsent.svelte"]
---

# Ecom Cookie banner UI and texts

## Overview
A vanilla DOM renderer inside a Shadow DOM host: a non-modal banner (`role=region`), a modal preferences panel with focus trap, Esc and focus return, a floating reopen button and a toast (`src/lib/consent/ui.ts:1-3`). `ui.ts` read at `:1-160` and `:265-300`, middle section skimmed by search; the other files read in full (i18n rows checked for language keys only).

## UI (`ui.ts`)
- `createUi(doc, config, state, handlers)` returns `{ banner(kind), panel(grants), closePanel, floating(show), toast(msg), destroy }` (`:16-38`, `:52`).
- Host element `<ecom-cookie>` with an open shadow root; `config.theme` values become `--ec-*` properties (`:40-44`, `:52-60`). Strings are HTML-escaped; links allow only `http(s):`, `/`, `#`, `mailto:`; logos only `http(s):`, a local path or `data:image/` (`:46-50`).
- Links row: privacy policy, cookie policy, and on notice banners the Do Not Sell link when the mode asks for it (`:108-113`).
- `avoidSelector`: lifts the banner above any visible fixed bottom bar within 300 px of the bottom, updated on resize and through a `ResizeObserver` (`:115-148`).
- Banner markup `section.bn role=region` with title, opt-in body or notice body (`:150-160`). Preference switches are `role=switch` buttons; the cookie table shows the plain `label` with the technical name under it (`:192-195`). Panel is `role=dialog aria-modal=true` (`:201-202`).
- Floating button: `aria-label` "Cookie settings" text, opens preferences, and starts `autoHide` (`:267-283`). Toast `role=status` for 2.6 s (`:284-290`).

## Styles (`ui-css.ts`)
Shadow styles fall back to the page's theme variables (`--color-*`, `--radius-theme`, `--radius-button`, `--font-body`) when `--ec-*` is unset (`:1-5`); banner positions and the tablet-portrait centring rule (`:6-10`).

## Auto-hide (`auto-hide.ts`)
`autoHide(win, hide, delay = 5000)` calls `hide` once: after 5 s, on the first page scroll of at least 24 px, or when a search box gets focus or input; it returns a stop function (`:1-41`).

## Texts (`i18n.ts`, `i18n/*.ts`)
Twenty languages in positional rows (`i18n/row.ts:1-11`): `a.ts` en es fr de it, `b.ts` pt nl pl sv da, `c.ts` nb fi ja ko zh, `d.ts` tr ar th vi id (keys read on 89960fc). `toTexts` maps a row to `ConsentTexts` (`i18n.ts:14-28`). `pickLanguage` tries a forced language, then the browser list, by primary tag (`no`/`nn` map to `nb`), else English (`:34-51`). Arabic, Hebrew, Persian and Urdu are right-to-left (`:32`, `:53`). `textsFor(lang, overrides)` applies `'*'` then the language's overrides; blank strings fall back to the built-in text (`:55-75`).

## Svelte wrapper (`svelte/CookieConsent.svelte`)
Props `config`, `posthog`, bindable `manager`, `onready`; on mount it calls `createConsent(config, { posthog })`, sets `manager`, calls `onready`, and destroys the manager on unmount (`:1-28`). Used by the store layout (see [storefront wiring](storefront-consent-visitor-pixel.md)).

## Tests (not run here)
`src/lib/consent/auto-hide.test.ts`, `src/lib/consent/i18n.test.ts` (titles not read).
