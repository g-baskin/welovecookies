---
type: concept
title: "Choice lifecycle (click \u2192 cookie \u2192 signals \u2192 record POST)"
status: seed
created: "2026-11-09"
updated: "2026-11-09"
tags:
  - "concept"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related:
  - "[[entities/consent-manager]]"
  - "[[entities/consent-ui]]"
  - "[[entities/consent-cookie]]"
  - "[[entities/consent-signals]]"
  - "[[entities/consent-autoclear]]"
  - "[[concepts/consent-cookie-format]]"
  - "[[concepts/hosted-install-flow]]"
sources:
  - "src/lib/consent/consent.ts:209-262"
  - "src/lib/consent/consent.ts:315-355"
  - "src/lib/consent/signals.ts:98-124"
  - "src/lib/consent/autoclear.ts:111-139"
  - "src/lib/consent/types.ts:71-94"
---
# Choice lifecycle

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Before any click (init)

1. Read the newest valid cookie copy and compute effective grants (`src/lib/consent/consent.ts:130-131`).
2. `applyDefaults` from the mode rule, with marketing off under GPC, then `applyGrants` (PostHog stays `pending` while an ask-first choice is missing), then auto-clear (`src/lib/consent/consent.ts:315-327`). This runs before the UI, so tags placed after the script see the defaults.
3. Mount the UI once `<body>` exists. A non-ask-first mode with GPC and no choice records action `gpc` silently. Otherwise `bannerFor` decides the banner (`src/lib/consent/consent.ts:329-355`).

## On a click (`choose`, `src/lib/consent/consent.ts:209-262`)

1. **UI handler:** the [[entities/consent-ui]] button calls `acceptAll`, `rejectAll`, `save` or `acknowledge`.
2. **Normalise:** GPC forces `marketing:false`. `custom` with everything off after something was on becomes `withdraw`. The existing consent id is kept (`src/lib/consent/consent.ts:211-216`).
3. **Synchronous step:** update state, write the cookie ([[concepts/consent-cookie-format]]), close the panel and banner, update the floating button, and show the "saved" toast unless the action is `acknowledge` or the choice is silent (`src/lib/consent/consent.ts:223-229`).
4. **Deferred step** (`setTimeout 0`): `applyGrants` to vendors, run auto-clear, dispatch the `welovecookies:change` event and call `onChange` listeners (`src/lib/consent/consent.ts:242-245`).
5. **Record POST:** send `ConsentRecordPayload` (path only, plus `site` on a hosted install) to `endpoints.record` (`src/lib/consent/consent.ts:230-241`, `src/lib/consent/consent.ts:246`). It is fire-and-forget. A failure is swallowed (`src/lib/consent/consent.ts:158`).
6. **Server correction:** if the reply's `consent` has the same id and differs from the local choice, it is adopted. The cookie is rewritten and the signals, auto-clear and event run again (`src/lib/consent/consent.ts:247-259`).

The network never blocks the UI, and errors never reach the page (`src/lib/consent/consent.ts:1-4`, `src/lib/consent/consent.ts:86-94`).

Related: [[entities/consent-manager]], [[entities/consent-signals]], [[entities/consent-autoclear]], [[concepts/hosted-install-flow]].
