---
type: entity
title: 'Admin D1 schema (admin/migrations/0001_init.sql)'
entity_type: data-model
status: seed
created: 2026-11-09
updated: 2026-11-09
path: admin/migrations/0001_init.sql
language: sql
depends_on: []
used_by:
  - "[[entities/admin-test-d1]]"
last_commit_hash: baf8b7a
tested_by: []
tags:
  - entity
  - admin
  - hand-authored
  - partial_scan
related: []
sources:
  - admin/migrations/0001_init.sql:1-98
---

# Admin D1 schema (admin/migrations/0001_init.sql)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

First and only admin schema. Forward-only; no IP address stored (`admin/migrations/0001_init.sql:1-2`). Accessed through [[entities/admin-db]]; applied by `npm run admin:db:local` / `admin:deploy` (wrangler) and by [[entities/admin-test-d1]] in tests.

## Tables

| Table | Key | Notes |
| --- | --- | --- |
| `sites` | `key` PK (`ws_*`, length 15) | `origin` UNIQUE, `https://` or localhost/127.0.0.1; `privacy_url` '' or https; `enabled` 0/1; `settings_json` valid JSON; `rev` >= 1 (`admin/migrations/0001_init.sql:5-16`) |
| `consent_records` | `id` INTEGER PK | FK `site`; `consent_id` length 16; `action` in 6 actions; grants 0/1; `mode` in 6 region modes; `country` 2 chars or NULL; `rev` >= 0; `lang` <= 12; `device` phone/tablet/desktop; `page`, `user_agent` <= 200 (`admin/migrations/0001_init.sql:19-37`) |
| `consent_daily` | PK (day, site, metric, mode, country, device) | cookieless counters; `metric` in seen + 6 actions; `count` >= 0 (`admin/migrations/0001_init.sql:43-52`) |
| `consent_versions` | PK (site, rev) | banner version snapshots, `texts_json`, `cookies_json` (`admin/migrations/0001_init.sql:55-62`) |
| `privacy_requests` | `id` TEXT PK | kind, status (default `new`), email 3-254, name <= 120, message <= 1000, `due_at`, `closed_at`, note <= 2000 (`admin/migrations/0001_init.sql:65-79`) |
| `check_results` | `site` PK | latest tracking check, `issues_json` (`admin/migrations/0001_init.sql:84-88`) |
| `rate_events` | `id` INTEGER PK | kind login/request, `ip_hash` <= 64 chars (`admin/migrations/0001_init.sql:92-97`) |

All `site` FKs reference `sites(key)` `ON DELETE RESTRICT`, matching "switched off, never deleted".

## Indexes

- `consent_records_lookup (site, consent_id)`, `consent_records_site_time (site, created_at)`, `consent_records_time (created_at)` (`admin/migrations/0001_init.sql:38-40`)
- `privacy_requests_site_status (site, status, due_at)`, `privacy_requests_email (email, created_at)` (`admin/migrations/0001_init.sql:80-81`)
- `rate_events_kind_ip_time (kind, ip_hash, at)` (`admin/migrations/0001_init.sql:98`)

## Gotchas

- **Forward-only.** Never edit this file once released; add a new numbered migration (0002_name.sql) and list it in `MIGRATIONS` in `admin/src/test-d1.ts:6`.
- `consent_records.rev` allows 0 while `consent_versions.rev` and `sites.rev` require >= 1 (`admin/migrations/0001_init.sql:31`, `admin/migrations/0001_init.sql:57`, `admin/migrations/0001_init.sql:13`).
- `consent_daily.mode` and `device` have no CHECK, unlike `consent_records` (`admin/migrations/0001_init.sql:47-49`).
- `admin/wrangler.jsonc` ships a placeholder `database_id` the buyer replaces (`admin/wrangler.jsonc:14`).

## Connections

- **depends_on:** none
- **used_by:** [[entities/admin-test-d1]]

## Tested by

- No test file imports this module directly.

## History

- **Last touched:** commit `baf8b7a` on 2026-11-09 (from `git log -1 -- admin/migrations/0001_init.sql`).

## Sources

- `admin/migrations/0001_init.sql:1-98`
