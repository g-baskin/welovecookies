---
type: entity
title: 'admin/src/pages/login.ts (sign-in, sign-out, setup page)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/pages/login.ts
language: ts
depends_on:
  - "[[entities/admin-auth]]"
  - "[[entities/admin-db]]"
  - "[[entities/admin-html]]"
used_by:
  - "[[entities/admin-index]]"
last_commit_hash: baf8b7a
tested_by: []
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related: []
sources:
  - admin/src/pages/login.ts:1-50
---

# admin/src/pages/login.ts (sign-in, sign-out, setup page)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Sign-in form and handlers, plus the 503 setup page shown until secrets are set.

## Signature / Definition

```ts
export const loginPage = () => Response
export async function handleLogin(request, env, db, now?): Promise<Response>
export const handleLogout = () => Response
export const setupPage = (problem: string) => Response   // 503
```

## Behavior

- `handleLogin`: same-origin check (403), then blocked check (429) (`admin/src/pages/login.ts:31-33`). The attempt is counted **before** the password check so parallel guesses can't slip past (`admin/src/pages/login.ts:34-35`). Form capped at 4096 bytes, password at 500 chars (`admin/src/pages/login.ts:36-38`). Wrong password -> 401 (`admin/src/pages/login.ts:39`); success clears failures and sets the session cookie with a 303 to `/admin` (`admin/src/pages/login.ts:40-41`).
- `handleLogout` clears the cookie (`admin/src/pages/login.ts:44`).

## Connections

- **depends_on:** [[entities/admin-auth]], [[entities/admin-db]], [[entities/admin-html]]
- **used_by:** [[entities/admin-index]]

## Tested by

- No test file imports this module directly.

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/src/pages/login.ts`).

## Sources

- `admin/src/pages/login.ts:1-50`
