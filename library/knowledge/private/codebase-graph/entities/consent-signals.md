---
type: entity
title: "signals.ts"
entity_type: module
status: seed
created: "2026-11-09"
updated: "2026-11-09"
path: "src/lib/consent/signals.ts"
language: ts
depends_on:
  - "[[entities/consent-types]]"
  - "[[entities/consent-trackers]]"
used_by:
  - "[[entities/consent-manager]]"
  - "[[entities/consent-standalone]]"
  - "[[entities/consent-index]]"
  - "[[entities/consent-svelte-component]]"
last_commit_hash: "888ca73"
tested_by:
  - "src/lib/consent/signals.test.ts"
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related:
  - "[[concepts/choice-lifecycle]]"
sources:
  - "src/lib/consent/signals.ts:1-166"
---
# signals.ts

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Overview

Passes grants on to vendors through their globals. It never imports vendor SDKs, and every call is wrapped so that a missing or failing vendor never throws (`src/lib/consent/signals.ts:1-4`, `src/lib/consent/signals.ts:40-46`). "Google Consent Mode" here means Google's API, not a region mode.

## Signature / Definition

```ts
export interface PostHogLike { opt_in_capturing; opt_out_capturing; reset?; has_opted_in_capturing?; get_explicit_consent_status? }
export interface SignalTarget { dataLayer?; gtag?; uetq?; fbq?; ttq?; posthog?; document? }
export const DEFAULT_INTEGRATIONS: ConsentIntegrations;   // all true
export function googleState(grants);
export function applyDefaults(w, grants, int?);
export function applyGrants(w, grants, int?, opts?: { posthog?, pending?, event?, blockScripts? });
export function applyPostHog(ph, analytics);
export function activateScripts(doc, grants);
```

## Behavior

- Every integration is on unless set to `false` (`src/lib/consent/signals.ts:29-37`).
- `googleState`: the three `ad_*` keys follow marketing, `analytics_storage` follows analytics, `personalization_storage` follows preferences, and functionality and security are always granted (`src/lib/consent/signals.ts:48-58`).
- `ensureGtag` creates `dataLayer` and a `gtag` that pushes `arguments`, because gtag.js reads the Arguments object (`src/lib/consent/signals.ts:60-71`).
- `applyDefaults`: gtag `consent default` with `wait_for_update: 500`, UET `consent default`, and TikTok `holdConsent` (`src/lib/consent/signals.ts:73-90`).
- `applyGrants`: gtag and UET `update`, then Meta `fbq('consent', grant|revoke)` and TikTok grant/revoke. PostHog is skipped while `pending`. It pushes the `welovecookies_update` event to dataLayer unless `event: false`, then holds or releases known trackers (`holdTrackers`, or `stopHolding` when `knownTrackers` is off) and only then runs script blocking. A released tracker is restored in place, so it no longer matches `type="text/plain"` and never runs twice (`src/lib/consent/signals.ts:102-131`).
- `applyPostHog`: opts in when analytics is on. When it is off and the visitor had opted in, it calls `reset()` then `opt_out_capturing()`, and otherwise opts out unless already denied (`src/lib/consent/signals.ts:133-142`).
- `activateScripts` clones `script[type=text/plain][data-consent]` into a real script once every listed category is allowed. It marks the original `data-consent-activated` so it never runs twice, and honours `data-src` and `data-type` (`src/lib/consent/signals.ts:144-166`).

## Connections

- **depends_on:** [[entities/consent-types]], [[entities/consent-trackers]] (`holdTrackers`, `stopHolding`)
- **used_by:** [[entities/consent-manager]], [[entities/consent-standalone]] (`hostedDefaults`), [[entities/consent-index]], [[entities/consent-svelte-component]] (type only)
- **related concepts:** [[concepts/choice-lifecycle]]

## Tested by

- `src/lib/consent/signals.test.ts`

## History

- **Created:** commit `888ca73` (2026-11-09) "Add We Love Cookies: location-aware cookie consent"
