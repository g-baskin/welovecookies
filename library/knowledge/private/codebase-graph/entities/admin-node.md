---
type: entity
title: 'admin/src/node/ (self-hosted Node runtime)'
entity_type: module
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/src/node/http.ts
language: ts
depends_on:
  - "[[entities/admin-index]]"
  - "[[entities/admin-sqlite]]"
  - "[[entities/admin-auth]]"
  - "[[entities/admin-db]]"
used_by: []
last_commit_hash: uncommitted
tested_by:
  - admin/src/node/http.test.ts
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related:
  - "[[entities/admin-config]]"
  - "[[concepts/admin-request-security]]"
sources:
  - admin/src/node/http.ts:1-200
  - admin/src/node/run.ts:1-119
  - admin/src/node/server.ts:1-17
---

# admin/src/node/ (self-hosted Node runtime)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Runs the Worker's `route()` ([[entities/admin-index]]) as a plain Node.js process with a SQLite file ([[entities/admin-sqlite]]), supplying what Cloudflare would (ADR 0008, `docs/ADMIN-SELF-HOSTED.md`). `index.ts` never imports these files, so the Worker bundle is unchanged. It only runs bundled: `npm run admin:node:build` writes `admin/node-dist/server.mjs` plus a chunk.

## Signature / Definition

```ts
// http.ts
export const MAX_BODY = 1_048_576
export interface NodeOptions { env; publicUrl; trustProxy?; countryHeader?; regionHeader?; script: Buffer; maxBody? }
export function publicOrigin(value): { origin } | { error }
export function clientIp(req, trustProxy?): string
export function memoryLimiter(limit = 120, periodMs = 60_000, clock?): { limit({ key }) }
export function toRequest(req, body, o): Request
export function createHandler(o, handle = route): (req, res) => Promise<void>
export function msUntilDaily(now): number
```

## Behavior

- `server.ts` exits with a clear message on Node older than 22.13, loads `admin/.env` if present (environment wins), then dynamically imports `run.ts`, so `node:sqlite` is only loaded after the check (`admin/src/node/server.ts:6-17`).
- `run.ts` handles `backup <file>` (`admin/src/node/run.ts:22-36`), validates `WLC_PUBLIC_URL`, the header names, `PORT` and the script path (`admin/src/node/run.ts:38-49`), creates the database folder owner-only (`0700`), opens and migrates the database and exits on failure (`admin/src/node/run.ts:51-61`), builds `env` with the in-memory limiter (`admin/src/node/run.ts:63-68`), listens on `WLC_HOST` (default `127.0.0.1`) and `PORT` (8787) (`admin/src/node/run.ts:78-92`), runs `daily()` at 03:17 UTC (`admin/src/node/run.ts:94-105`) and closes cleanly, once, on SIGTERM/SIGINT (`admin/src/node/run.ts:107-119`).
- `toRequest` builds the URL from `publicUrl` plus the request path only, so a Host header or `//host/path` request target can't change the origin `buildConfig` puts in endpoints (`admin/src/node/http.ts:111-115`). It always overwrites `cf-connecting-ip` with the socket address, or the rightmost `X-Forwarded-For` entry when `trustProxy` (`admin/src/node/http.ts:58-66`, `admin/src/node/http.ts:122`). IPv4-mapped `::ffff:` addresses are unwrapped so `ipKey` doesn't lump all IPv4 visitors into one /64 (`admin/src/node/http.ts:50-56`). Location is attached as `request.cf` only from the configured headers; `placeOf` validates it (`admin/src/node/http.ts:129-137`).
- `createHandler` serves `/welovecookies.min.js` with an ETag and one-hour cache, refuses bodies over `maxBody` with 413 and closes the connection, writes every `Set-Cookie` separately via `getSetCookie()`, sends no body for HEAD, and answers 500 on errors (`admin/src/node/http.ts:141-192`).
- `memoryLimiter` is a fixed window per key that sweeps expired keys at most once per period (`admin/src/node/http.ts:69-87`).

## Gotchas

- **Geo headers are trusted as sent.** Only configure them when every request passes a proxy that overwrites them.
- **One process.** Limits are in memory and SQLite has one writer.
- `run.ts` resolves `../data`, `../migrations` and `../../dist/welovecookies.min.js` relative to `admin/node-dist/`, not `admin/src/node/`.

## Connections

- **depends_on:** [[entities/admin-index]], [[entities/admin-sqlite]], [[entities/admin-auth]], [[entities/admin-db]]
- **used_by:** none (entry point; `admin/Dockerfile` and `npm run admin:node` run it)

## Tested by

- `admin/src/node/http.test.ts`: setup page, script and ETag, real routes, Host header ignored, IP spoofing ignored, geo only when configured, strictest mode without location, 429, several cookies, 413, 500, helpers.

## History

- **Last touched:** not yet committed (feature/self-hosted-admin).

## Sources

- `admin/src/node/http.ts:1-200`
- `admin/src/node/run.ts:1-119`
- `admin/src/node/server.ts:1-17`
