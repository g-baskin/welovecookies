---
type: entity
title: "trackers.ts"
entity_type: module
status: seed
created: "2026-11-10"
updated: "2026-11-10"
path: "src/lib/consent/trackers.ts"
language: ts
depends_on:
  - "[[entities/consent-types]]"
used_by:
  - "[[entities/consent-signals]]"
  - "[[entities/consent-standalone]]"
  - "[[entities/consent-index]]"
last_commit_hash: "1dead03"
tested_by:
  - "src/lib/consent/trackers.test.ts"
  - "e2e/trackers.spec.ts"
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related:
  - "[[concepts/choice-lifecycle]]"
sources:
  - "src/lib/consent/trackers.ts:1-279"
---
# trackers.ts

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Overview

Holds well-known trackers that other code adds after the banner loaded (a tag manager, a plugin) until their category is allowed. A matching `<script>` is turned into the shape [[entities/consent-signals]] already supports: `type="text/plain"`, `data-consent="<category>"`, the URL in `data-src`, plus the `data-wlc-held` marker. The URL is never set on a held script, so a script made with `createElement` sends no request before consent (`src/lib/consent/trackers.ts:1-6`). Decision: ADR 0009.

## Signature / Definition

```ts
export const KNOWN_TRACKERS: Record<OptionalCategory, readonly string[]>;   // host or host/path-prefix
export function trackerCategory(url, baseHref, extra?): OptionalCategory | null;
export function holdTrackers(w: SignalTarget, grants, extra?): void;   // install once, update, release
export function stopHolding(w: SignalTarget): void;   // unhook, unwatch, release all
```

## Behavior

- The list covers Hotjar, Clarity, Mixpanel, Segment and Matomo Cloud (analytics), and LinkedIn, Pinterest, Snap, Reddit and X (marketing). Google, Meta, TikTok, UET and PostHog are left out because their consent signals already control them (`src/lib/consent/trackers.ts:10-31`).
- `trackerCategory` resolves the URL against the page, accepts only http(s), and matches a host exactly or as a subdomain plus an optional path prefix. Owner entries (`blockScripts`) may be pasted with a scheme; non-strings and empty entries never match (`src/lib/consent/trackers.ts:35-68`).
- State lives on the document under `Symbol.for('welovecookies.trackers')`, so it installs once per document (`src/lib/consent/trackers.ts:70-84`, `src/lib/consent/trackers.ts:217-247`).
- **Hook:** the wrapped `document.createElement` gives each new `<script>` instance-level `src`, `type` and `setAttribute` traps. Setting a held URL stores it in `data-src`; later `type` writes go to `data-type`. If a property cannot be redefined it warns once and lets the script through (`src/lib/consent/trackers.ts:149-199`).
- **Observer:** a `MutationObserver` on the document holds added `<script src>` elements of a runnable type before the parser runs them (`src/lib/consent/trackers.ts:201-215`). Script-inserted elements that bypass `createElement` have already started by then, so this path is for parsed HTML; holding such a script stops nothing, and restoring it does not run it again.
- **Release:** a held script whose category is now allowed is restored in place: its type, then its `src`. Setting `src` again runs it only where the browser would have run it anyway, so a `<script>` from `innerHTML` (marked "already started" by the browser) still never runs, and a script that had already started does not run twice. A restored script is no `text/plain` match, so `activateScripts` skips it (`src/lib/consent/trackers.ts:128-147`).
- `holdTrackers` updates grants and owner hosts, then releases (`src/lib/consent/trackers.ts:249-262`). `stopHolding` disconnects the observer, restores `createElement` only if it is still ours, and releases everything held (`src/lib/consent/trackers.ts:264-279`).
- Every step runs inside `safe()`: holding is a safety net and never throws into the page (`src/lib/consent/trackers.ts:86-92`).

## Connections

- **depends_on:** [[entities/consent-types]] (and the `SignalTarget` type from [[entities/consent-signals]])
- **used_by:** [[entities/consent-signals]] (`applyGrants`), [[entities/consent-standalone]] (`hostedDefaults`), [[entities/consent-index]]
- **related concepts:** [[concepts/choice-lifecycle]]

## Tested by

- `src/lib/consent/trackers.test.ts` (happy-dom: matching, hook, observer, release, stop)
- `e2e/trackers.spec.ts` (Chromium: ask-first, Accept, Reject, an `innerHTML` tag that must never run, opt-out, off switch)

## History

- **Created:** on `feature/hold-known-trackers` (2026-11-10), from base `1dead03`
