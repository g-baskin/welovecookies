---
type: entity
title: "cookie.ts"
entity_type: module
status: seed
created: "2026-11-09"
updated: "2026-11-09"
path: "src/lib/consent/cookie.ts"
language: ts
depends_on:
  - "[[entities/consent-types]]"
used_by:
  - "[[entities/consent-manager]]"
  - "[[entities/consent-index]]"
  - "[[entities/admin-record]]"
  - "[[entities/admin-requests]]"
  - "[[entities/admin-pages-records]]"
last_commit_hash: "888ca73"
tested_by:
  - "src/lib/consent/contract.test.ts"
  - "src/lib/consent/consent.test.ts"
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related:
  - "[[concepts/consent-cookie-format]]"
  - "[[concepts/choice-lifecycle]]"
sources:
  - "src/lib/consent/cookie.ts:1-111"
---
# cookie.ts

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Overview

The consent cookie wire format, which both the browser and servers read (`src/lib/consent/cookie.ts:1-5`). **This format is a wire contract** (ADR 0004). Changing the layout, `MODE_CODE`, `ACTION_CODE` or the cookie name makes every saved choice decode as `null`, so every visitor is asked again. `src/lib/consent/contract.test.ts:23-40` pins it. Full layout: [[concepts/consent-cookie-format]].

## Signature / Definition

```ts
export const CONSENT_ID_RE = /^[A-Za-z0-9_-]{16}$/;
export function newConsentId(): string;                    // 12 random bytes → 16 url-safe chars
export function encodeConsent(c: StoredConsent): string;
export function decodeConsent(raw): StoredConsent | null;
export function readCookie(header, name): string | null;
export function readCookies(header, name): string[];
export function newestConsent(values): StoredConsent | null;
export const isConsentMode, isConsentAction;               // type guards
```

## Behavior

- Mode codes `i u l g o n` (`src/lib/consent/cookie.ts:14-21`); action codes `a r c k w g` (`src/lib/consent/cookie.ts:22-29`).
- `newConsentId` base64url-encodes 12 bytes from `crypto.getRandomValues`, which gives 96 bits (`src/lib/consent/cookie.ts:37-44`).
- `encodeConsent` clamps `at` and `rev` to non-negative integers and writes `at` in base 36 (`src/lib/consent/cookie.ts:46-57`).
- `decodeConsent` returns null for input longer than 80 characters, a part count other than 7, a version other than `1`, a bad id, more than 12 base-36 digits for `at`, more than 6 digits for `rev`, bits other than 3, or unknown codes (`src/lib/consent/cookie.ts:59-77`). Malformed means "no choice".
- `readCookies` returns every copy (host-only and domain). `newestConsent` keeps the valid copy with the highest `at` (`src/lib/consent/cookie.ts:93-111`).
- Admin uses `CONSENT_ID_RE`, `isConsentAction` and `newConsentId` (`admin/src/record.ts:4`, `admin/src/requests.ts:3`, `admin/src/pages/records.ts:1`).

## Connections

- **depends_on:** [[entities/consent-types]]
- **used_by:** [[entities/consent-manager]], [[entities/consent-index]], [[entities/admin-record]], [[entities/admin-requests]], [[entities/admin-pages-records]]
- **related concepts:** [[concepts/consent-cookie-format]]

## Tested by

- `src/lib/consent/contract.test.ts:23-40`, `src/lib/consent/consent.test.ts`

## History

- **Created:** commit `888ca73` (2026-11-09) "Add We Love Cookies: location-aware cookie consent"
