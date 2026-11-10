---
type: concept
title: "Consent cookie format (wlc_consent v1)"
status: seed
created: "2026-11-09"
updated: "2026-11-09"
tags:
  - "concept"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related:
  - "[[entities/consent-cookie]]"
  - "[[entities/consent-types]]"
  - "[[entities/consent-manager]]"
sources:
  - "src/lib/consent/cookie.ts:1-77"
  - "src/lib/consent/types.ts:57-69"
  - "src/lib/consent/types.ts:265-266"
  - "src/lib/consent/contract.test.ts:23-40"
  - "src/lib/consent/consent.ts:177-190"
---
# Consent cookie format

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

Cookie `wlc_consent` (`CONSENT_COOKIE_NAME`, `src/lib/consent/types.ts:266`; can be overridden with `config.cookieName`). Its value is a **wire contract**, read by both the browser and servers (ADR 0004):

```
1.<id>.<at36>.<rev>.<mode>.<pam>.<action>
e.g. 1.k3J9x_aB2cD4eF6g.mfx2k1a0.1.i.011.c
```
(`src/lib/consent/cookie.ts:1-5`)

| Field | Meaning | Rule (`src/lib/consent/cookie.ts:59-77`) |
| --- | --- | --- |
| `1` | format version | must equal `1` |
| id | consent id, the proof-of-consent key | `/^[A-Za-z0-9_-]{16}$/` |
| at36 | ms epoch, base 36 | 1-12 `[0-9a-z]` |
| rev | banner revision | 1-6 digits |
| mode | `i u l g o n` = opt-in, opt-in-uk, opt-in-light, opt-out-gpc, opt-out, notice | `src/lib/consent/cookie.ts:14-21` |
| pam | preferences, analytics, marketing bits | `[01]{3}` |
| action | `a r c k w g` = accept_all, reject_all, custom, acknowledge, withdraw, gpc | `src/lib/consent/cookie.ts:22-29` |

Values longer than 80 characters or with any malformed part read as **no choice**.

## Writing

`path=/; SameSite=Lax; max-age=<maxAgeDays×86400>`, plus `domain=` from the root-domain probe when found, plus `Secure` on https. The host-only copy is removed first. When both copies exist anyway, the newest `at` wins (`src/lib/consent/consent.ts:177-190`, `src/lib/consent/cookie.ts:103-111`).

## Gotcha

Changing the layout, any code letter or the cookie name makes every existing choice decode as null, so **every visitor is asked again**. `src/lib/consent/contract.test.ts:23-40` pins the format. Change the `1` version only together with a migration plan.

Related: [[entities/consent-cookie]], [[entities/consent-manager]].
