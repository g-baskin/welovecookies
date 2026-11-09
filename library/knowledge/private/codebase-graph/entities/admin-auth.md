---
type: entity
title: 'admin/src/auth.ts (session, password, rate limits, body caps)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/auth.ts
language: ts
depends_on:
  - "[[entities/admin-db]]"
used_by:
  - "[[entities/admin-index]]"
  - "[[entities/admin-privacy]]"
  - "[[entities/admin-record]]"
  - "[[entities/admin-requests]]"
  - "[[entities/admin-pages-login]]"
last_commit_hash: baf8b7a
tested_by:
  - admin/src/auth.test.ts
  - admin/src/review.test.ts
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related: []
sources:
  - admin/src/auth.ts:1-188
---

# admin/src/auth.ts (session, password, rate limits, body caps)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

One-owner auth: signed session cookie, Origin check for admin POSTs, sign-in limit per hashed IP, and capped body readers shared by public endpoints (`admin/src/auth.ts:1`).

## Signature / Definition

```ts
export const SESSION_COOKIE = '__Host-wlc_admin'; SESSION_MS = 12h; LOGIN_LIMIT = 5; LOGIN_WINDOW_MS = 15 min
export function setupProblem(env): string | null
export async function createSession(env, now?): Promise<string>        // "<expiry ms>.<sig>"
export async function verifySession(env, value, now?): Promise<boolean>
export async function passwordMatches(env, given): Promise<boolean>
export function ipKey(ip): string; export async function ipHash(secret, request): Promise<string>
export async function countEvents / noteEvent / loginBlocked / noteFailedLogin / clearFailedLogins
export async function readCapped(request, max); export async function readFormFields(request, max)
export function sameOrigin(request): boolean
```

## Behavior

- **Setup.** `ADMIN_PASSWORD` >= 12 chars and `SESSION_SECRET` >= 32 chars required (`admin/src/auth.ts:37-43`).
- **Session.** HMAC-SHA256 of `admin.<exp>` with key `SESSION_SECRET\0ADMIN_PASSWORD`, so changing either secret signs everyone out (`admin/src/auth.ts:49-56`). Verify rejects bad shape, expired, or expiry further than 12h out; compares in constant time (`admin/src/auth.ts:58-69`).
- **Cookie.** `HttpOnly; Secure; SameSite=Strict; Path=/`, `__Host-` prefix (`admin/src/auth.ts:5`, `admin/src/auth.ts:71-74`).
- **Password.** Both sides HMAC'd before a constant-time compare (`admin/src/auth.ts:84-91`).
- **IP hashing.** IPv6 collapsed to its /64 (`admin/src/auth.ts:94-104`); `ipHash` = HMAC of `cf-connecting-ip`, truncated to 32 chars; the address is never stored (`admin/src/auth.ts:106-109`).
- **Rate events.** Rows in `rate_events` with kind `login|request` (`admin/src/auth.ts:111-141`); blocked at 5 failures per 15 min (`admin/src/auth.ts:133-134`).
- **Body caps.** `readCapped` rejects on `content-length` or by streaming past `max` (`admin/src/auth.ts:144-167`). `readFormFields` accepts only urlencoded, keys <= 64 chars, values cut to 5000 (`admin/src/auth.ts:170-181`).
- **sameOrigin.** `Origin` must equal the request URL origin; without `Origin`, requires `sec-fetch-site: same-origin` (`admin/src/auth.ts:184-188`).

## Connections

- **depends_on:** [[entities/admin-db]]
- **used_by:** [[entities/admin-index]], [[entities/admin-privacy]], [[entities/admin-record]], [[entities/admin-requests]], [[entities/admin-pages-login]]

## Tested by

- `admin/src/auth.test.ts`
- `admin/src/review.test.ts`

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/auth.ts`).

## Sources

- `admin/src/auth.ts:1-188`
