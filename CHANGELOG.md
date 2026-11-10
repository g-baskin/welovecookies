# Changelog

All notable changes to We Love Cookies are recorded here.

The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases from 1.1.0 on are git tags (`vX.Y.Z`) with a GitHub Release. The
1.0.0 and 1.0.1 tags were added afterwards, on 2026-11-09, at the commits that
set those versions; 0.0.1 has no tag. A version appearing here does not mean it
was published to any package registry.

## [Unreleased]

## [1.1.0] - 2026-11-09

### Added

- A real-browser test (`npm run test:e2e`, Playwright with Chromium) of the
  banner (accept, reject, opt-out notice, notice mode, right-to-left) and the
  admin sign-in, run against a throwaway local admin database.
- A fresh-install test (`npm run test:local`) that copies the current files to
  a temp folder and runs `npm ci`, every check, the build, and the demo and
  admin over HTTP.
- Screenshots from the browser test in the README and the new
  `docs/TESTING.md` (`npm run screenshots` refreshes them).
- A social preview image for link previews (`docs/assets/social-preview.jpg`).
- A version test (`src/version.test.ts`) that keeps `package.json`, the lock
  file, the WordPress plugin and the newest changelog entry on the same
  version.
- The demo server takes an optional `PORT`.
- Optional admin on Cloudflare (Worker + D1): manage sites, a hosted install
  that fetches its settings with `data-site`, consent records, and a hosted
  privacy request form. See `docs/ADMIN.md`.
- A glossary of the project's terms (`CONTEXT.md`) and architecture decision
  records in `docs/decisions/`.
- Tests for the banner UI, for configuring the script tag with `data-*`
  attributes, and a check that the committed `dist/` build matches the source.
- An OpenAPI 3.1 description of the hosted endpoints `/api/consent/config`,
  `/api/consent` and `/api/consent/seen` in `docs/api/openapi.json`.
- Internal knowledge docs and a code wiki in `library/` (Library Schema v2),
  with the wiki under `library/knowledge/private/codebase-graph/`.
- A docs test (`src/docs.test.ts`) that checks wiki citations, relative
  Markdown links and that the OpenAPI enums match the code.
- This changelog.
- Lint and format checks: `npm run lint` (ESLint with typescript-eslint) and
  `npm run format:check` / `npm run format` (Prettier). `npm run check` now
  also typechecks the build and demo scripts in `tools/` and the Svelte
  wrapper.

### Changed

- The admin, tools and tests were reformatted with Prettier (layout only; the
  served markup is unchanged).
- The consent law matrix now uses the same region and mode names as the code.
- The README developer section and the `dist/` note in `CLAUDE.md` now say
  that `dist.test.ts` checks `dist/` matches the source.
- ADR 0005 (committed build served from `main`) has a dated note about the new
  dist check.

## [1.0.1] - 2026-11-09

Set in commit `d6f1964` (tag `v1.0.1`).

### Added

- Per-framework install guides in `docs/INSTALL.md`.
- Licence and developer prerequisites in the docs.

### Changed

- The README leads with the plain script-tag install for any site.
- Licensed under AGPL-3.0-only, with commercial licences available from the
  owner. Built files keep a licence banner with a link to the source.

## [1.0.0] - 2026-11-09

Set in commit `f14f71e` (tag `v1.0.0`).

### Added

- Install on any website with a single script tag, plus an ESM module and an
  optional WordPress plugin zip.

### Changed

- Removed code that only made sense for one kind of site, so the banner is
  generic.

## [0.0.1] - 2026-11-09

Set in commit `888ca73`.

### Added

- First version of We Love Cookies: a location-aware cookie consent banner that
  picks opt-in, opt-out or notice behaviour for the visitor's region.

[Unreleased]: https://github.com/g-baskin/welovecookies/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/g-baskin/welovecookies/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/g-baskin/welovecookies/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/g-baskin/welovecookies/compare/888ca73...v1.0.0
