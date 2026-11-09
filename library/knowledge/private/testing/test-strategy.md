# Test Strategy

> Category: Testing | Version: 1.0 | Date: November 2026 | Status: Active

For maintainers: what the test suite covers, how it runs and which tests guard contracts.

**Related:**
- [`../architecture/overview.md`](../architecture/overview.md)
- [`../build-release/release-process.md`](../build-release/release-process.md)
- [`../codebase-graph/entities/admin-test-d1.md`](../codebase-graph/entities/admin-test-d1.md)
- [`../codebase-graph/concepts/consent-cookie-format.md`](../codebase-graph/concepts/consent-cookie-format.md)
- [`../../../../docs/decisions/0004-consent-cookie-format-v1.md`](../../../../docs/decisions/0004-consent-cookie-format-v1.md)

---

## How it runs

`npm run test` is `vitest run` over `src/**/*.test.ts` and `admin/src/**/*.test.ts` (`vitest.config.ts:3`). `npm run check` runs `tsc --noEmit` for the root and for `admin/`. There is no CI, so both are run by hand before merging.

## Consent core

Tests sit next to the modules in `src/lib/consent/`. Most run in Node; `ui.test.ts` and `standalone.dom.test.ts` opt into happy-dom with a `// @vitest-environment happy-dom` header.

Two tests guard what ships:

- `contract.test.ts` pins the `wlc_consent` cookie format: round-trips an encoded choice and rejects junk, a wrong version prefix and an unknown mode code. Changing the format makes every saved choice decode as null ([ADR 0004](../../../../docs/decisions/0004-consent-cookie-format-v1.md), [consent-cookie-format](../codebase-graph/concepts/consent-cookie-format.md)).
- `dist.test.ts` builds the two scripts into a temp folder and asserts the committed `dist/` files are byte-identical and start with the licence banner (`src/lib/consent/dist.test.ts:13`).

## Admin

Admin tests run the real migration SQL on an in-memory `node:sqlite` database, not D1 (`admin/src/test-d1.ts:3`, [admin-test-d1](../codebase-graph/entities/admin-test-d1.md)). New migrations must be added to `MIGRATIONS` (`admin/src/test-d1.ts:6`), and SQL must work on both engines.

Coverage by file: `auth.test.ts` (session cookie, sign-in limit, same-origin posts), `cors.test.ts` (exact-origin CORS, no credentials or wildcard), `data.test.ts` (settings, sites, privacy requests, CSV formula defusing, retention purge, tracking check), `index.test.ts` (routed sign-in and admin pages, escaping), `public.test.ts` (public config, record, seen and privacy-form endpoints), and `review.test.ts` (regression tests for security and quality review fixes).

## Docs

`src/docs.test.ts` checks wiki citations, relative links and OpenAPI enums in the docs.
