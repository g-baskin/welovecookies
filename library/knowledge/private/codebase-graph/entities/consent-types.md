---
type: entity
title: "types.ts"
entity_type: module
status: seed
created: "2026-11-09"
updated: "2026-11-09"
path: "src/lib/consent/types.ts"
language: ts
depends_on: []
used_by:
  - "[[entities/consent-manager]]"
  - "[[entities/consent-regions]]"
  - "[[entities/consent-cookie]]"
  - "[[entities/consent-signals]]"
  - "[[entities/consent-ui]]"
  - "[[entities/consent-autoclear]]"
  - "[[entities/consent-i18n]]"
  - "[[entities/consent-device]]"
  - "[[entities/consent-standalone]]"
  - "[[entities/consent-index]]"
  - "[[entities/consent-svelte-component]]"
  - "[[entities/admin-record]]"
  - "[[entities/admin-config]]"
  - "[[entities/admin-settings]]"
  - "[[entities/admin-labels]]"
  - "[[entities/admin-tracking]]"
  - "[[entities/admin-pages-banner]]"
last_commit_hash: "f14f71e"
tested_by:
  - "src/lib/consent/contract.test.ts"
tags:
  - "entity"
  - "consent"
  - "hand-authored"
  - "partial_scan"
related:
  - "[[concepts/config-precedence]]"
  - "[[concepts/consent-cookie-format]]"
  - "[[concepts/choice-lifecycle]]"
sources:
  - "src/lib/consent/types.ts:1-111"
  - "src/lib/consent/types.ts:113-256"
---
# types.ts

> Hand-authored seed page (no graph driver); verify against source before relying on line numbers.

## Overview

The shared consent contract for the browser core, the standalone script and any server that records choices. "Change it only additively; servers depend on it" (`src/lib/consent/types.ts:1-6`). It has no runtime imports.

## Signature / Definition

```ts
CONSENT_CATEGORIES, OPTIONAL_CATEGORIES, Grants, ALL_GRANTED, NONE_GRANTED   // :9-17
CONSENT_MODES / ConsentMode                                                  // :28-36
CONSENT_ACTIONS / ConsentAction                                              // :44-52
DEVICES / Device                                                             // :54-55
StoredConsent, ConsentRecordPayload, ConsentRecordResponse, ConsentSeenPayload // :58-103
HOSTED_CONFIG_PATH = '/api/consent/config'                                   // :111
CookieInfo, ConsentTexts, ConsentTextOverrides, ConsentTheme                 // :114-181
BANNER_POSITIONS, ConsentIntegrations, ConsentConfig                         // :187-253
CONSENT_COOKIE_NAME = 'wlc_consent'                                          // :256
```

## Behavior

- `necessary` is always on and is never stored. `Grants` covers only the three optional categories (`src/lib/consent/types.ts:8-17`).
- `ConsentRecordPayload.page` is the path only, never the query string. `site` is set on a hosted install (`src/lib/consent/types.ts:72-89`). The server may correct the choice in `ConsentRecordResponse` (`src/lib/consent/types.ts:90-94`).
- `ConsentConfig.mode` accepts `'auto'`, which guesses from the browser time zone (`src/lib/consent/types.ts:207-208`). `country` and `region` are declared but the manager does not read them (no use in `src/lib/consent/consent.ts`).
- The `opt-in-light` doc comment notes India's lighter rules "until 2027" (`src/lib/consent/types.ts:23`). This is dated legal data.
- `cookieDomain` defaults to `'auto'` (`src/lib/consent/types.ts:232-236`). `autoClear` adds to the built-in list (`src/lib/consent/types.ts:242-246`).

## Connections

- **depends_on:** none
- **used_by:** every consent module ([[entities/consent-manager]], [[entities/consent-regions]], [[entities/consent-cookie]], [[entities/consent-signals]], [[entities/consent-ui]], [[entities/consent-autoclear]], [[entities/consent-i18n]], [[entities/consent-device]], [[entities/consent-standalone]], [[entities/consent-index]], [[entities/consent-svelte-component]]) and admin ([[entities/admin-record]], [[entities/admin-config]], [[entities/admin-settings]], [[entities/admin-labels]], [[entities/admin-tracking]], [[entities/admin-pages-banner]])
- **related concepts:** [[concepts/config-precedence]], [[concepts/consent-cookie-format]]

## Tested by

- `src/lib/consent/contract.test.ts`, plus indirect coverage from every test that imports it

## History

- **Created:** commit `888ca73` (2026-11-09) "Add We Love Cookies: location-aware cookie consent"
- **Last touched:** commit `f14f71e` (2026-11-09), any-website install (PR #3)
