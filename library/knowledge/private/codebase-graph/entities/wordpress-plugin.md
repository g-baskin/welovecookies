---
type: entity
title: 'welovecookies (WordPress plugin, stub)'
entity_type: module
status: stub
created: 2026-11-09
updated: 2026-11-09
path: wordpress/welovecookies/welovecookies.php
language: php
source_extension: ".php"
depends_on: []
used_by: []
last_commit_hash: d6f1964
tested_by: []
tags:
  - entity
  - stub
  - hand-authored
  - partial_scan
related: []
sources:
  - wordpress/welovecookies/welovecookies.php:1-58
---

# welovecookies (WordPress plugin, stub)

> [!note] Hand-authored seed page (no graph driver), written from reading the source. `partial_scan`.

## Overview

Stub: PHP is outside the v1 extraction grammar. Optional install path, one of many (ADR 0006); the product is not a WordPress plugin.

## Names (no deep extraction)

- Header `Version: 1.0.1` (`wordpress/welovecookies/welovecookies.php:5`) and `define( 'WELOVECOOKIES_VERSION', '1.0.1' )` (`wordpress/welovecookies/welovecookies.php:17`).
- `function welovecookies_config()` (`wordpress/welovecookies/welovecookies.php:22-32`) ending in filter `welovecookies_config` (`wordpress/welovecookies/welovecookies.php:31`).
- Action `wp_head` at priority 1: inline `window.WeLoveCookiesConfig` then the script with `?ver=WELOVECOOKIES_VERSION` (`wordpress/welovecookies/welovecookies.php:35-46`).
- Shortcode `[welovecookies_settings]` (`wordpress/welovecookies/welovecookies.php:52-58`).

## Gotchas

- Bump `Version:` and `WELOVECOOKIES_VERSION` together when shipping new JS; the `?ver=` cache key comes from the constant.
- `assets/` is gitignored and filled by [[entities/tool-build-consent]]; the JS exists only inside `dist/welovecookies-wordpress.zip`.

## Connections

- **depends_on:** none
- **used_by:** none (no non-test importer)

## Tested by

- No test file imports this module directly.

## History

- **Last touched:** commit `d6f1964` on 2026-11-09 (from `git log -1 -- wordpress/welovecookies/welovecookies.php`).

## Sources

- `wordpress/welovecookies/welovecookies.php:1-58`
