# Code wiki

Hand-written pages about the code, one page per module (`entities/`), cross-cutting ideas (`concepts/`) and open questions (`questions/`). There is no graph driver here: pages were written by reading the source on 2026-11-09 (`status: seed`, tagged `hand-authored` / `partial_scan`), and `last_commit_hash` records the commit each page describes. `src/docs.test.ts` fails if a cited file or line range, or a `[[wiki link]]`, stops resolving.

Line numbers drift as code changes. When you change a module, check its page. Decisions live in [`docs/decisions/`](../../../../docs/decisions/README.md), terms in [`CONTEXT.md`](../../../../CONTEXT.md), and the narrative overview in [`architecture/overview.md`](../architecture/overview.md).

## Concepts

| Page | What it covers |
| --- | --- |
| [config-precedence](concepts/config-precedence.md) | Defaults → `data-*` → `WeLoveCookiesConfig` → `init()`; hosted config wins |
| [consent-cookie-format](concepts/consent-cookie-format.md) | The `wlc_consent` wire format (ADR 0004) |
| [region-mode-resolution](concepts/region-mode-resolution.md) | `auto` from the time zone in the browser, `modeFor()` on servers |
| [choice-lifecycle](concepts/choice-lifecycle.md) | Click → cookie → signals → record POST |
| [hosted-install-flow](concepts/hosted-install-flow.md) | `data-site` → `/api/consent/config` → record and seen POSTs |
| [admin-request-security](concepts/admin-request-security.md) | Exact-origin CORS, same-origin posts, rate limits, escaping, CSP |

## Consent core (`src/lib/consent/`)

| Page | Source |
| --- | --- |
| [consent-standalone](entities/consent-standalone.md) | `standalone.ts`: `window.WeLoveCookies`, built to the IIFE |
| [consent-index](entities/consent-index.md) | `index.ts`: ESM API |
| [consent-manager](entities/consent-manager.md) | `consent.ts`: `createConsent` |
| [consent-regions](entities/consent-regions.md) | `regions.ts`: region tables and mode rules |
| [consent-cookie](entities/consent-cookie.md) | `cookie.ts`: cookie encode/decode |
| [consent-types](entities/consent-types.md) | `types.ts` |
| [consent-ui](entities/consent-ui.md) | `ui.ts`: banner and preferences panel |
| [consent-ui-css](entities/consent-ui-css.md) | `ui-css.ts` |
| [consent-signals](entities/consent-signals.md) | `signals.ts`: vendor consent signals |
| [consent-autoclear](entities/consent-autoclear.md) | `autoclear.ts` |
| [consent-i18n](entities/consent-i18n.md) | `i18n.ts` |
| [consent-i18n-rows](entities/consent-i18n-rows.md) | `i18n/row.ts`, `i18n/a.ts`–`d.ts`: positional text rows |
| [consent-wiretap](entities/consent-wiretap.md) | `wiretap.ts`: helper for buyers, not called by the banner |
| [consent-device](entities/consent-device.md) | `device.ts` |
| [consent-auto-hide](entities/consent-auto-hide.md) | `auto-hide.ts` |
| [consent-svelte-component](entities/consent-svelte-component.md) | `svelte/CookieConsent.svelte` (stub) |

## Admin (`admin/`)

| Page | Source |
| --- | --- |
| [admin-index](entities/admin-index.md) | `src/index.ts`: router and daily job |
| [admin-config](entities/admin-config.md) | `src/config.ts`: `GET /api/consent/config` |
| [admin-record](entities/admin-record.md) | `src/record.ts`: `POST /api/consent`, `/api/consent/seen` |
| [admin-cors](entities/admin-cors.md) | `src/cors.ts` |
| [admin-privacy](entities/admin-privacy.md) | `src/privacy.ts`: hosted request form |
| [admin-auth](entities/admin-auth.md) | `src/auth.ts` |
| [admin-db](entities/admin-db.md) | `src/db.ts` |
| [admin-html](entities/admin-html.md) | `src/html.ts` |
| [admin-csv](entities/admin-csv.md) | `src/csv.ts` |
| [admin-labels](entities/admin-labels.md) | `src/labels.ts` |
| [admin-log](entities/admin-log.md) | `src/log.ts` |
| [admin-requests](entities/admin-requests.md) | `src/requests.ts` |
| [admin-settings](entities/admin-settings.md) | `src/settings.ts` |
| [admin-sites](entities/admin-sites.md) | `src/sites.ts` |
| [admin-tracking](entities/admin-tracking.md) | `src/tracking.ts` |
| [admin-test-d1](entities/admin-test-d1.md) | `src/test-d1.ts`: `node:sqlite` stand-in for tests |
| [admin-pages-layout](entities/admin-pages-layout.md) | `src/pages/layout.ts` |
| [admin-pages-login](entities/admin-pages-login.md) | `src/pages/login.ts` |
| [admin-pages-overview](entities/admin-pages-overview.md) | `src/pages/overview.ts` |
| [admin-pages-records](entities/admin-pages-records.md) | `src/pages/records.ts` |
| [admin-pages-banner](entities/admin-pages-banner.md) | `src/pages/banner.ts` |
| [admin-pages-requests](entities/admin-pages-requests.md) | `src/pages/requests.ts` |
| [admin-pages-sites](entities/admin-pages-sites.md) | `src/pages/sites.ts` |
| [admin-data-model](entities/admin-data-model.md) | `migrations/0001_init.sql`: D1 tables |

## Tools and WordPress

| Page | Source |
| --- | --- |
| [tool-build-consent](entities/tool-build-consent.md) | `tools/build-consent.mjs`: `npm run build` |
| [tool-serve-demo](entities/tool-serve-demo.md) | `tools/serve-demo.mjs`: `npm run demo` |
| [wordpress-plugin](entities/wordpress-plugin.md) | `wordpress/welovecookies/welovecookies.php` (stub) |

## Open questions

- [admin-limiter-optional-and-local](questions/admin-limiter-optional-and-local.md): the public rate limit is off when `PUBLIC_LIMITER` is missing.
- [consent-dist-freshness-test](questions/consent-dist-freshness-test.md): answered; `dist.test.ts` checks the JS bundles.
