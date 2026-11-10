---
type: entity
title: "consent.ts (createConsent)"
entity_type: module
status: seed
created: "2026-11-09"
updated: "2026-11-09"
path: "src/lib/consent/consent.ts"
language: ts
depends_on:
  - "[[entities/consent-autoclear]]"
  - "[[entities/consent-cookie]]"
  - "[[entities/consent-device]]"
  - "[[entities/consent-i18n]]"
  - "[[entities/consent-regions]]"
  - "[[entities/consent-signals]]"
  - "[[entities/consent-types]]"
  - "[[entities/consent-ui]]"
used_by:
  - "[[entities/consent-standalone]]"
  - "[[entities/consent-index]]"
  - "[[entities/consent-svelte-component]]"
last_commit_hash: "888ca73"
tested_by:
  - "src/lib/consent/consent.test.ts"
  - "src/lib/consent/autoclear.test.ts"
  - "src/lib/consent/standalone.test.ts"
  - "src/lib/consent/ui.test.ts"
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related:
  - "[[concepts/choice-lifecycle]]"
  - "[[concepts/region-mode-resolution]]"
  - "[[concepts/consent-cookie-format]]"
  - "[[concepts/config-precedence]]"
sources:
  - "src/lib/consent/consent.ts:1-50"
  - "src/lib/consent/consent.ts:96-131"
  - "src/lib/consent/consent.ts:143-190"
  - "src/lib/consent/consent.ts:209-262"
  - "src/lib/consent/consent.ts:264-358"
---
# consent.ts (the consent manager)

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Overview

`createConsent(config, options)` is the manager: it resolves the region mode, reads and writes the consent cookie, applies signals, mounts the UI and POSTs records and seen counts (`src/lib/consent/consent.ts:1-4`). It never throws into the page: any error during creation returns a no-op manager (`src/lib/consent/consent.ts:96-103`, `src/lib/consent/consent.ts:80-84`).

## Signature / Definition

```ts
export function createConsent(config: ConsentConfig, options?: ConsentOptions): ConsentManager;
interface ConsentManager { get; onChange; acceptAll; rejectAll; save; acknowledge; openPreferences; showBanner; destroy }
interface ConsentState { mode; grants; stored; gpc; lang; device }
```
(`src/lib/consent/consent.ts:32-50`, options incl. `root`, `now`, `fetch`, `ui`, `timeZone`: `src/lib/consent/consent.ts:68-78`)

## Behavior

- **Mode:** `'auto'` resolves through `modeFromTimeZone(Intl…timeZone)` only. There is no country lookup in the browser (`src/lib/consent/consent.ts:112-119`).
- **GPC:** `config.gpc === true` or `navigator.globalPrivacyControl === true` (`src/lib/consent/consent.ts:121`).
- **Stored choice:** the newest valid copy across host-only and domain cookies (`src/lib/consent/consent.ts:130`), then `effectiveGrants` (`src/lib/consent/consent.ts:131`).
- **Init order:** `applyDefaults` first (GPC forces marketing off in the defaults), then `applyGrants` with PostHog `pending` while an ask-first choice is missing, then auto-clear. All of this runs before the UI (`src/lib/consent/consent.ts:315-328`). The UI waits for `DOMContentLoaded` when `<body>` is missing (`src/lib/consent/consent.ts:354-356`).
- **Silent GPC choice:** in a non-ask-first mode with GPC and no current choice, it records action `gpc` silently and shows no banner (`src/lib/consent/consent.ts:345-346`).
- **choose():** `custom` with everything off after something was on becomes `withdraw` (`src/lib/consent/consent.ts:214`). The consent id is reused (`src/lib/consent/consent.ts:216`). The cookie write and UI close happen synchronously, then a `setTimeout(0)` runs signals, auto-clear, the `welovecookies:change` event and the record POST (`src/lib/consent/consent.ts:223-261`).
- **Known trackers:** every `applyGrants` call passes `config.blockScripts`, so held trackers follow the same grants (`src/lib/consent/consent.ts:243`, `src/lib/consent/consent.ts:257`, `src/lib/consent/consent.ts:326`). `destroy()` leaves the `createElement` hook in place, because `init()` creates the next manager straight away and keeps using it; see [[entities/consent-trackers]].
- **Server correction:** a record reply carrying `consent` with the same id that differs from the local choice is adopted, rewritten and re-applied (`src/lib/consent/consent.ts:246-260`).
- **POST:** same-origin requests use `keepalive` with same-origin credentials. Cross-origin requests (hosted install) use CORS with `credentials: 'omit'` and no keepalive (`src/lib/consent/consent.ts:143-159`).
- **Cookie domain:** with `'auto'`, it probes `rootCandidates(host)` with a `<name>_probe` cookie. Before writing a domain copy it drops the host-only copy. `max-age` comes from the mode's `maxAgeDays`, and `Secure` is added on https (`src/lib/consent/consent.ts:160-190`).
- **Seen POST:** at most once per manager, on the first banner shown (`src/lib/consent/consent.ts:265-277`).
- **acceptAll** turns `preferences` on only if `preferencesCategory` is set or it was already on (`src/lib/consent/consent.ts:285-290`). **openPreferences** shows every switch off in ask-first modes without a current choice (`src/lib/consent/consent.ts:300-303`).

## Connections

- **depends_on:** [[entities/consent-regions]], [[entities/consent-cookie]], [[entities/consent-signals]], [[entities/consent-autoclear]], [[entities/consent-ui]], [[entities/consent-i18n]], [[entities/consent-device]], [[entities/consent-types]]
- **used_by:** [[entities/consent-standalone]], [[entities/consent-index]], [[entities/consent-svelte-component]]
- **related concepts:** [[concepts/choice-lifecycle]], [[concepts/region-mode-resolution]], [[concepts/consent-cookie-format]]

## Tested by

- `src/lib/consent/consent.test.ts`, `src/lib/consent/autoclear.test.ts`, `src/lib/consent/standalone.test.ts`, `src/lib/consent/ui.test.ts`

## History

- **Created:** commit `888ca73` (2026-11-09) "Add We Love Cookies: location-aware cookie consent"
