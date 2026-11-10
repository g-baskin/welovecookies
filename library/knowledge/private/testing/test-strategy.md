# Test Strategy

> Category: Testing | Version: 1.1 | Date: November 2026 | Status: Active

For maintainers: what the test suite covers, how it runs and which tests guard contracts.

**Related:**
- [`../architecture/overview.md`](../architecture/overview.md)
- [`../build-release/release-process.md`](../build-release/release-process.md)
- [`../codebase-graph/entities/admin-test-d1.md`](../codebase-graph/entities/admin-test-d1.md)
- [`../codebase-graph/entities/tool-test-local.md`](../codebase-graph/entities/tool-test-local.md)
- [`../../../../docs/TESTING.md`](../../../../docs/TESTING.md)
- [`../codebase-graph/concepts/consent-cookie-format.md`](../codebase-graph/concepts/consent-cookie-format.md)
- [`../../../../docs/decisions/0004-consent-cookie-format-v1.md`](../../../../docs/decisions/0004-consent-cookie-format-v1.md)

---

## How it runs

`npm run test` is `vitest run` over `src/**/*.test.ts` and `admin/src/**/*.test.ts` (`vitest.config.ts:3`). `npm run check` runs `tsc --noEmit` for the root, `admin/`, `tools/` and `e2e/` (JavaScript checked with `checkJs`), then `svelte-check` on `svelte/CookieConsent.svelte`. `npm run lint` runs ESLint with typescript-eslint, and `npm run format:check` runs Prettier. There is no CI, so all four are run by hand before merging.

## Consent core

Tests sit next to the modules in `src/lib/consent/`. Most run in Node; `ui.test.ts` and `standalone.dom.test.ts` opt into happy-dom with a `// @vitest-environment happy-dom` header.

Two tests guard what ships:

- `contract.test.ts` pins the `wlc_consent` cookie format: round-trips an encoded choice and rejects junk, a wrong version prefix and an unknown mode code. Changing the format makes every saved choice decode as null ([ADR 0004](../../../../docs/decisions/0004-consent-cookie-format-v1.md), [consent-cookie-format](../codebase-graph/concepts/consent-cookie-format.md)).
- `dist.test.ts` builds the two scripts into a temp folder and asserts the committed `dist/` files are byte-identical and start with the licence banner (`src/lib/consent/dist.test.ts:13`).

## Admin

Admin tests run the real migration SQL on an in-memory `node:sqlite` database, not D1 (`admin/src/test-d1.ts:3`, [admin-test-d1](../codebase-graph/entities/admin-test-d1.md)). New migrations must be added to `MIGRATIONS` (`admin/src/test-d1.ts:6`), and SQL must work on both engines.

Coverage by file: `auth.test.ts` (session cookie, sign-in limit, same-origin posts), `cors.test.ts` (exact-origin CORS, no credentials or wildcard), `data.test.ts` (settings, sites, privacy requests, CSV formula defusing, retention purge, tracking check), `index.test.ts` (routed sign-in and admin pages, escaping), `public.test.ts` (public config, record, seen and privacy-form endpoints), and `review.test.ts` (regression tests for security and quality review fixes).

## Docs

`src/docs.test.ts` checks wiki citations, relative links and OpenAPI enums in the docs. `src/version.test.ts` checks that `package.json`, `package-lock.json`, both version fields in `welovecookies.php`, `readme.txt` `Stable tag` and the newest `CHANGELOG.md` release agree.

## Browser and fresh-install tests

Kept out of `npm run test` so it stays fast and browser-free; run them before a release and after UI or admin changes. The buyer-facing guide is `docs/TESTING.md`.

- `npm run test:e2e` is Playwright on Chromium (`playwright.config.ts`, specs in `e2e/`). It starts the demo on 4174 (never reusing a running one, which could be another checkout's `dist/`) and a test admin on 8788 via `e2e/start-admin.mjs`: a fresh `--persist-to` database in the OS temp folder and test-only secrets from `e2e/admin-env.mjs` passed with `--var`, which wins over `admin/.dev.vars`. `banner.spec.ts` checks the cookie value for Accept all (`.i.111.a`) and Reject all (`.i.000.r`), the reload, opt-out notice, notice mode and RTL; `admin.spec.ts` checks sign-in, the Websites page and the public endpoints.
- `npm run screenshots` runs the same specs through `e2e/screenshots.config.ts`, whose `metadata.screenshots` makes them save `docs/assets/screenshots/*.png`.
- `npm run test:local` ([tool-test-local](../codebase-graph/entities/tool-test-local.md)) installs a fresh copy of the current files in a temp folder and runs every check, the build (dist JS must not change), and the demo and admin over HTTP.
