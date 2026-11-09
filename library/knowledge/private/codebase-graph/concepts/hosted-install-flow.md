---
type: concept
title: 'Hosted install flow'
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
  - "[[entities/admin-sites]]"
  - "[[entities/admin-config]]"
  - "[[entities/admin-cors]]"
  - "[[entities/admin-record]]"
  - "[[entities/admin-index]]"
  - "[[entities/consent-standalone]]"
  - "[[entities/consent-manager]]"
  - "[[concepts/config-precedence]]"
  - "[[concepts/choice-lifecycle]]"
sources:
  - admin/src/sites.ts:100-101
  - src/lib/consent/standalone.ts:26-105
  - src/lib/consent/types.ts:111
  - admin/src/index.ts:87-95
  - admin/src/config.ts:29-78
  - admin/src/cors.ts:17-26
  - src/lib/consent/consent.ts:143-159
  - src/lib/consent/consent.ts:242-276
  - admin/src/record.ts:103-169
---

# Hosted install flow

> [!note] Hand-authored seed page (no graph driver); `partial_scan`. Only what the code does.

## Definition

A **hosted install** loads a site's config by **site key** from the admin Worker that serves the script, instead of from page config. The Worker decides region mode from the connection and receives choices and banner views.

## How it works

1. **Tag.** The owner copies `<script src="<worker>/welovecookies.min.js" data-site="ws_..." async>` from the Websites page ([[entities/admin-sites]], `admin/src/sites.ts:100-101`).
2. **Safe defaults.** With `data-site` and a `src`, [[entities/consent-standalone]] sets Google Consent Mode and Microsoft UET to denied before anything loads (`src/lib/consent/standalone.ts:51-54`, `src/lib/consent/standalone.ts:95-97`).
3. **Fetch config.** `loadHosted` GETs `/api/consent/config?site=<key>` resolved against the script URL, `credentials: 'omit'`, `mode: 'cors'` (`src/lib/consent/standalone.ts:30-39`; path constant `src/lib/consent/types.ts:111`). Any failure, non-OK status or bad body -> fallback `{ mode: 'auto', rev: 1, floatingButton: true, site }`, i.e. no records (`src/lib/consent/standalone.ts:35`, `src/lib/consent/standalone.ts:40-47`).
4. **Worker answers.** [[entities/admin-index]] rate-limits then routes (`admin/src/index.ts:91-93`). Preflight: only an enabled site's exact origin gets 204 (`admin/src/config.ts:74-78`). [[entities/admin-cors]] requires an enabled site and byte-equal `Origin` (`admin/src/cors.ts:17-26`). Banner switched off -> 404, so the script falls back (`admin/src/config.ts:68-69`). Otherwise `buildConfig` returns mode from `request.cf`, `rev`, owner settings and `endpoints.record`/`seen` on the Worker origin (`admin/src/config.ts:29-60`).
5. **init args.** The fetched config is passed to `api.init(c)` unless `data-auto="false"` (`src/lib/consent/standalone.ts:99-101`). `init` spreads it last, so it overrides `data-*` and `window.WeLoveCookiesConfig` (`src/lib/consent/standalone.ts:80-87`); see [[concepts/config-precedence]].
6. **Seen POST.** First time a banner shows, the manager POSTs `{ mode, device, lang, site }` to `endpoints.seen` (`src/lib/consent/consent.ts:265-276`). Cross-origin posts use `credentials: 'omit'`, `mode: 'cors'`, no keepalive (`src/lib/consent/consent.ts:143-159`). Worker bumps `consent_daily` unless bot, returns 204 (`admin/src/record.ts:153-169`).
7. **Record POST.** On a choice the manager POSTs the record payload to `endpoints.record` (`src/lib/consent/consent.ts:246`). The Worker saves with server mode, capped revision and GPC correction, and returns `{ ok, consent }` (`admin/src/record.ts:103-151`). If that differs from the local choice with the same id, the script rewrites its cookie and reapplies grants (`src/lib/consent/consent.ts:246-260`). See [[concepts/choice-lifecycle]].

## Notes

- The site key is public; only the site's exact origin can use it (CONTEXT.md, `admin/src/cors.ts:24`).
- Switching a site off makes config/record return 404 (`admin/src/cors.ts:23`).

## Sources

- `admin/src/sites.ts:100-101`
- `src/lib/consent/standalone.ts:26-105`
- `src/lib/consent/types.ts:111`
- `admin/src/index.ts:87-95`
- `admin/src/config.ts:29-78`
- `admin/src/cors.ts:17-26`
- `src/lib/consent/consent.ts:143-159`
- `src/lib/consent/consent.ts:242-276`
- `admin/src/record.ts:103-169`
