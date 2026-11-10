# Architecture Overview

> Category: Architecture | Version: 1.0 | Date: November 2026 | Status: Active

For maintainers: what the parts of We Love Cookies are and how they connect.

**Related:**
- [`../build-release/release-process.md`](../build-release/release-process.md)
- [`../testing/test-strategy.md`](../testing/test-strategy.md)
- [`../codebase-graph/concepts/config-precedence.md`](../codebase-graph/concepts/config-precedence.md)
- [`../codebase-graph/concepts/hosted-install-flow.md`](../codebase-graph/concepts/hosted-install-flow.md)
- [`../../../../docs/decisions/0006-script-tag-first.md`](../../../../docs/decisions/0006-script-tag-first.md)
- [`../../../../docs/decisions/0007-admin-on-cloudflare.md`](../../../../docs/decisions/0007-admin-on-cloudflare.md)
- [`../../../../docs/decisions/0008-self-hosted-admin.md`](../../../../docs/decisions/0008-self-hosted-admin.md)

---

## The parts

The product is one script tag. Everything else is an optional install path or add-on ([ADR 0006](../../../../docs/decisions/0006-script-tag-first.md)).

| Part | Source | Wiki page |
| --- | --- | --- |
| One-tag IIFE script (`dist/welovecookies.min.js`), exposes `window.WeLoveCookies` | `src/lib/consent/standalone.ts` | [consent-standalone](../codebase-graph/entities/consent-standalone.md) |
| ESM module (`dist/welovecookies.mjs`) | `src/lib/consent/index.ts` | [consent-index](../codebase-graph/entities/consent-index.md) |
| Consent manager: mode, cookie, signals, UI, record/seen POSTs | `src/lib/consent/consent.ts` | [consent-manager](../codebase-graph/entities/consent-manager.md) |
| Region → mode tables and per-mode rules | `src/lib/consent/regions.ts` | [consent-regions](../codebase-graph/entities/consent-regions.md) |
| Cookie wire format | `src/lib/consent/cookie.ts` | [consent-cookie](../codebase-graph/entities/consent-cookie.md) |
| Shared types, UI, i18n rows | `types.ts`, `ui.ts`, `i18n/row.ts` | [consent-types](../codebase-graph/entities/consent-types.md), [consent-ui](../codebase-graph/entities/consent-ui.md), [consent-i18n-rows](../codebase-graph/entities/consent-i18n-rows.md) |
| Optional admin: Cloudflare Worker + D1 | `admin/src/index.ts` | [admin-index](../codebase-graph/entities/admin-index.md), [admin-data-model](../codebase-graph/entities/admin-data-model.md) |
| Optional admin on your own server: Node + SQLite | `admin/src/node/server.ts` | [admin-node](../codebase-graph/entities/admin-node.md), [admin-sqlite](../codebase-graph/entities/admin-sqlite.md) |
| WordPress plugin, one optional install path | `wordpress/welovecookies/welovecookies.php` | [wordpress-plugin](../codebase-graph/entities/wordpress-plugin.md) |
| Build and local demo | `tools/build-consent.mjs`, `tools/serve-demo.mjs`, `demo/index.html` | [tool-build-consent](../codebase-graph/entities/tool-build-consent.md), [tool-serve-demo](../codebase-graph/entities/tool-serve-demo.md) |

`src/lib/consent/wiretap.ts` and `modeFor()` are helpers for buyers' server-side code; the banner never calls them.

## How config reaches the banner

Config merges in order, later wins: defaults → script `data-*` attributes → `window.WeLoveCookiesConfig` → `init()` arguments. `mode: 'auto'` guesses from the browser's IANA time zone and falls back to `opt-in`; there is no IP lookup in the browser. Details: [config-precedence](../codebase-graph/concepts/config-precedence.md) and [region-mode-resolution](../codebase-graph/concepts/region-mode-resolution.md).

The WordPress plugin fits the same path: it prints an inline `WeLoveCookiesConfig` plus the script at `wp_head` priority 1.

## Hosted install and logging

With `data-site`, the script fetches its config from `/api/consent/config` on the script's own origin (`loadHosted`, `src/lib/consent/standalone.ts:31`) and passes it as the `init()` arguments, so the admin's settings override everything else. Any failure falls back to a working banner in `auto` mode with no logging. See [hosted-install-flow](../codebase-graph/concepts/hosted-install-flow.md) and [admin-config](../codebase-graph/entities/admin-config.md).

When `endpoints` are set (`src/lib/consent/standalone.ts:73`), the manager POSTs each choice to the record endpoint (`src/lib/consent/consent.ts:246`) and sends one "seen" POST per page (`src/lib/consent/consent.ts:275`). The Worker stores these via `admin/src/record.ts` ([admin-record](../codebase-graph/entities/admin-record.md)). Request hardening is covered in [admin-request-security](../codebase-graph/concepts/admin-request-security.md); the choice itself in [choice-lifecycle](../codebase-graph/concepts/choice-lifecycle.md) and [consent-cookie-format](../codebase-graph/concepts/consent-cookie-format.md).

## The admin shares the consent core

The admin imports `src/lib/consent/*.ts` directly instead of a package, for example `admin/src/config.ts:4` and `admin/src/record.ts:4`. A change to the consent core therefore changes the admin too; `npm run check` typechecks both.
