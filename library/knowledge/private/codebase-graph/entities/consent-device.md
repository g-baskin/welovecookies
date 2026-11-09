---
type: entity
title: "device.ts"
entity_type: function
status: seed
created: "2026-11-09"
updated: "2026-11-09"
path: "src/lib/consent/device.ts"
language: ts
depends_on:
  - "[[entities/consent-types]]"
used_by:
  - "[[entities/consent-manager]]"
  - "[[entities/consent-index]]"
last_commit_hash: "888ca73"
tested_by:
  - "src/lib/consent/device.test.ts"
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related: []
sources:
  - "src/lib/consent/device.ts:1-14"
---
# device.ts (`deviceOf`)

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Overview

Sorts the visitor into phone, tablet or desktop for layout and for the record and seen payloads (`src/lib/consent/device.ts:1-14`).

## Signature / Definition

```ts
export function deviceOf(width: number, userAgent = '', maxTouchPoints = 0): Device;
```

## Behavior

- Width under 600 means phone. A tablet user agent means tablet, and so does iPadOS (a Mac user agent with more than one touch point) or Android without `mobile`. A touch device up to 1366 px wide that is not Windows, ChromeOS or Linux x86 also counts as tablet. An iPhone or mobile user agent under 900 px is a phone. Everything else is desktop (`src/lib/consent/device.ts:4-14`).

## Connections

- **used_by:** [[entities/consent-manager]] (`src/lib/consent/consent.ts:123`), [[entities/consent-index]]

## Tested by

- `src/lib/consent/device.test.ts`

## History

- **Created:** commit `888ca73` (2026-11-09) "Add We Love Cookies: location-aware cookie consent"
