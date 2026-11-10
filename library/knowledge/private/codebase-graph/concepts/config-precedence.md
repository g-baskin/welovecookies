---
type: concept
title: "Config precedence"
status: seed
created: "2026-11-09"
updated: "2026-11-09"
tags:
  - "concept"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related:
  - "[[entities/consent-standalone]]"
  - "[[entities/consent-types]]"
  - "[[entities/consent-i18n]]"
  - "[[concepts/hosted-install-flow]]"
sources:
  - "src/lib/consent/standalone.ts:61-110"
  - "src/lib/consent/standalone.dom.test.ts:6-18"
  - "src/lib/consent/types.ts:211-263"
  - "src/lib/consent/i18n.ts:55-75"
---
# Config precedence

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

For the script-tag build, the final `ConsentConfig` is built by object spread. **Later sources win** (`src/lib/consent/standalone.ts:85-92`):

1. Built-in defaults: `{ mode: 'auto', rev: 1, floatingButton: true }`
2. Script `data-*` attributes via `fromScript` (`src/lib/consent/standalone.ts:61-77`)
3. `window.WeLoveCookiesConfig`
4. `WeLoveCookies.init(config)` arguments

`src/lib/consent/standalone.dom.test.ts:6-18` pins this order.

## Hosted install

With `data-site`, the config fetched from `/api/consent/config` is passed as the `init()` argument (`src/lib/consent/standalone.ts:104-105`). It is therefore layer 4 and overrides everything else, including `WeLoveCookiesConfig`. If the fetch fails, the fallback `{mode:'auto', rev:1, floatingButton:true, site}` likewise overrides the earlier layers (`src/lib/consent/standalone.ts:36`). See [[concepts/hosted-install-flow]].

## Notes

- The spread is shallow. Nested objects such as `links`, `endpoints` and `texts` from a later layer replace the earlier object instead of merging with it.
- Texts have their own layering inside `textsFor`: built-ins, then `texts['*']`, then `texts[lang]`, with blank strings ignored (`src/lib/consent/i18n.ts:55-75`).
- ESM and Svelte users call `createConsent(config)` directly. That path has no layering and no defaults for `rev` or `mode` (`src/lib/consent/types.ts:211-219` marks both as required).

Related: [[entities/consent-standalone]], [[entities/consent-types]], [[entities/consent-i18n]].
