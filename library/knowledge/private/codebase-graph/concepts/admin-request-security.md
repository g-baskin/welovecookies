---
type: concept
title: 'Admin request security'
complexity: intermediate
domain: "admin"
aliases: []
created: 2026-11-09
updated: 2026-11-09
status: seed
tags:
  - concept
  - admin
  - hand-authored
  - partial_scan
related:
  - "[[entities/admin-auth]]"
  - "[[entities/admin-cors]]"
  - "[[entities/admin-html]]"
  - "[[entities/admin-index]]"
  - "[[entities/admin-privacy]]"
  - "[[entities/admin-requests]]"
  - "[[entities/admin-pages-login]]"
  - "[[entities/admin-record]]"
sources:
  - admin/src/cors.ts:1-26
  - admin/src/config.ts:86-94
  - admin/src/auth.ts:37-188
  - admin/src/index.ts:32-138
  - admin/src/privacy.ts:16-90
  - admin/src/requests.ts:48-135
  - admin/src/html.ts:1-69
  - admin/src/pages/login.ts:30-50
  - admin/src/pages/layout.ts:29-36
  - admin/src/record.ts:21-32
  - admin/src/csv.ts:2-6
  - admin/src/settings.ts:61-64
  - admin/wrangler.jsonc:18-20
---

# Admin request security

> [!note] Hand-authored seed page (no graph driver); `partial_scan`. Only what the code does.

## Definition

The controls the admin Worker applies to every request, grouped by surface. Only what the code does.

## Banner endpoints (cross-origin)

- **Exact-origin CORS.** `Origin` must equal the stored `sites.origin`; no credentials header is ever sent; `vary: Origin` (`admin/src/cors.ts:4-26`). Preflight answers only an enabled site's origin, max-age 1 day (`admin/src/config.ts:86-94`, `admin/src/cors.ts:9-14`).
- **Body cap.** JSON bodies capped at 8192 bytes, streamed (`admin/src/record.ts:21`, `admin/src/auth.ts:144-167`).
- **Rate limit.** Optional `PUBLIC_LIMITER` binding, keyed by path plus hashed IP; 120 per 60 s per Cloudflare location as shipped (`admin/src/index.ts:93-110`, `admin/wrangler.jsonc:18-20`). Absent binding = no limit.
- Bot user agents are stored but not counted (`admin/src/record.ts:32`, `admin/src/record.ts:150`).

## Hosted privacy form

- POST needs `Origin` == the Worker origin (`admin/src/privacy.ts:78-79`); form cap 8192 bytes (`admin/src/privacy.ts:16`); honeypot field (`admin/src/privacy.ts:85`).
- Limits: 5/day per hashed IP, 3/day per email, 100/day per site (`admin/src/requests.ts:48-52`, `admin/src/requests.ts:84-109`). Email regex blocks mailto header injection (`admin/src/requests.ts:50-51`).

## Admin pages

- **Auth.** Admin unusable until `ADMIN_PASSWORD` >= 12 and `SESSION_SECRET` >= 32 (`admin/src/auth.ts:37-43`, `admin/src/index.ts:37-38`). HMAC-signed 12h session in `__Host-` cookie, `HttpOnly; Secure; SameSite=Strict` (`admin/src/auth.ts:5-6`, `admin/src/auth.ts:53-74`). Constant-time compares (`admin/src/auth.ts:27-34`, `admin/src/auth.ts:85-91`).
- **Sign-in limit.** 5 failures per 15 min per hashed IP (IPv6 /64), counted before the password check (`admin/src/auth.ts:7-8`, `admin/src/auth.ts:94-109`; `admin/src/pages/login.ts:38-41`).
- **Same-origin posts.** Every signed-in POST and the login POST must pass `sameOrigin` (Origin match, else `sec-fetch-site: same-origin`) (`admin/src/index.ts:48-49`, `admin/src/pages/login.ts:36`, `admin/src/auth.ts:184-188`).
- **Body caps.** Admin forms 65,536 bytes, urlencoded only, keys <= 64, values <= 5000 (`admin/src/index.ts:32`, `admin/src/index.ts:52-53`; `admin/src/auth.ts:170-181`).

## Output

- **Escaping.** `html` tag escapes every value; `raw()` is trusted-only (`admin/src/html.ts:1-31`). Flash messages come from a fixed map (`admin/src/pages/layout.ts:29-36`).
- **Headers.** CSP `default-src 'none'; style-src 'self'; ...; frame-ancestors 'none'`, `no-store`, `nosniff`, `DENY` framing, `same-origin` referrer (`admin/src/html.ts:33-48`). Inline styles and scripts are blocked; styles live in `CSS` at `/wlc.css`.
- **Data hygiene.** CSV formula guard (`admin/src/csv.ts:2-6`); theme values filtered by `safeCssValue` (`admin/src/settings.ts:61-64`); recorded page reduced to a same-origin path (`admin/src/record.ts:90-97`). No IP address is stored; only keyed hashes in `rate_events`.

## Sources

- `admin/src/cors.ts:1-26`
- `admin/src/config.ts:86-94`
- `admin/src/auth.ts:37-188`
- `admin/src/index.ts:32-138`
- `admin/src/privacy.ts:16-90`
- `admin/src/requests.ts:48-135`
- `admin/src/html.ts:1-69`
- `admin/src/pages/login.ts:30-50`
- `admin/src/pages/layout.ts:29-36`
- `admin/src/record.ts:21-32`
- `admin/src/csv.ts:2-6`
- `admin/src/settings.ts:61-64`
- `admin/wrangler.jsonc:18-20`
