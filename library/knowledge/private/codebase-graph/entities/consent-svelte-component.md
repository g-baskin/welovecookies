---
type: entity
title: "CookieConsent"
entity_type: module
status: stub
created: "2026-11-09"
updated: "2026-11-09"
path: "src/lib/consent/svelte/CookieConsent.svelte"
language: svelte
source_extension: ".svelte"
depends_on:
  - "[[entities/consent-manager]]"
  - "[[entities/consent-signals]]"
  - "[[entities/consent-types]]"
used_by: []
last_commit_hash: "888ca73"
tested_by: []
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
  - "stub"
related: []
sources:
  - "src/lib/consent/svelte/CookieConsent.svelte:1-28"
---
# CookieConsent (Svelte stub)

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

> **Stub:** Svelte is not a supported grammar for extraction. This is a filename-only stub awaiting the v2 upgrade.

A thin Svelte 5 wrapper. On mount it calls `createConsent(config, { posthog })`, binds `manager`, calls `onready`, and destroys the manager on unmount (`src/lib/consent/svelte/CookieConsent.svelte:1-28`). Nothing tests it.

## History

- **Created:** commit `888ca73` (2026-11-09) "Add We Love Cookies: location-aware cookie consent"
