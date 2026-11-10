# Release Process

> Category: Build Release | Version: 1.1 | Date: November 2026 | Status: Active

For maintainers shipping a change: how the build works, what gets committed and how each install path picks it up.

**Related:**
- [`../architecture/overview.md`](../architecture/overview.md)
- [`../testing/test-strategy.md`](../testing/test-strategy.md)
- [`../codebase-graph/entities/tool-build-consent.md`](../codebase-graph/entities/tool-build-consent.md)
- [`../codebase-graph/entities/wordpress-plugin.md`](../codebase-graph/entities/wordpress-plugin.md)
- [`../../../../docs/decisions/0005-committed-build-served-from-main.md`](../../../../docs/decisions/0005-committed-build-served-from-main.md)
- [`../../../../docs/decisions/0001-agpl-dual-licence.md`](../../../../docs/decisions/0001-agpl-dual-licence.md)

---

## dist/ is the release

`dist/` is committed build output, and jsDelivr serves it straight from the `main` branch ([ADR 0005](../../../../docs/decisions/0005-committed-build-served-from-main.md)). Merging to `main` is therefore a release for every site on `@main`. Version tags pin a release: every release is an annotated `vX.Y.Z` tag on `main` with a GitHub Release (from `v1.1.0`; `v1.0.0` and `v1.0.1` were tagged afterwards at the commits that set them), so `https://cdn.jsdelivr.net/gh/g-baskin/welovecookies@v1.1.0/dist/welovecookies.min.js` never changes. Never move or delete a pushed tag.

After any change in `src/lib/consent/`, run `npm run build` and commit `dist/`. `src/lib/consent/dist.test.ts` fails if the committed `welovecookies.min.js` or `welovecookies.mjs` differ from a fresh build (the WordPress zip isn't compared).

## What the build does

`npm run build` runs `tools/build-consent.mjs` ([tool-build-consent](../codebase-graph/entities/tool-build-consent.md)):

1. esbuild bundles `standalone.ts` to the IIFE `dist/welovecookies.min.js` and `index.ts` to `dist/welovecookies.mjs`, both minified for `es2019`.
2. Both files get the `/*! We Love Cookies | ... | AGPL-3.0-only | Source: ... */` banner (`tools/build-consent.mjs:9`). It must stay: it is how sites serving the script pass on the licence terms and source link ([ADR 0001](../../../../docs/decisions/0001-agpl-dual-licence.md)).
3. It copies the script to `admin/public/` and `wordpress/welovecookies/assets/` (both gitignored) and zips the plugin into `dist/welovecookies-wordpress.zip`. This step needs the system `zip` binary.

## WordPress path

The plugin's JS exists only inside the zip. When shipping new JS, bump `Version:` (`wordpress/welovecookies/welovecookies.php:5`) and `WELOVECOOKIES_VERSION` (`wordpress/welovecookies/welovecookies.php:17`) together; the script URL uses `?ver=` for caching, so sites keep the old file otherwise.

## Admin deploy

The admin runs on the buyer's own Cloudflare account. `npm run admin:deploy` copies the script, applies D1 migrations remotely and runs `wrangler deploy`; `admin:dev` and `admin:db:local` cover local work (`package.json`). Migrations are forward-only. Setup steps live in `docs/ADMIN.md`.

## Branches and changelog

Work on `feature/*`, open a PR into `dev`, and delete the feature branch once it is merged; only `dev` and `main` stay on GitHub. `main` is the release branch the CDN follows: release by merging a `dev` → `main` PR, then fast-forward `dev` to `main` and push it, so the two branches stay 0 commits apart. There is no CI, so run `npm run test`, `npm run check`, `npm run lint` and `npm run format:check` yourself before merging. Record user-visible changes in `CHANGELOG.md` at the repo root (Keep a Changelog format).

## Cutting release X.Y.Z

1. On a feature branch, set X.Y.Z in `package.json`, both root `version` fields of `package-lock.json`, `Version:` and `WELOVECOOKIES_VERSION` in `wordpress/welovecookies/welovecookies.php`, and `Stable tag` in `wordpress/welovecookies/readme.txt`. `src/version.test.ts` fails if any of them, or the newest `## [x.y.z]` heading in `CHANGELOG.md`, differ.
2. In `CHANGELOG.md`, rename `[Unreleased]` to `## [X.Y.Z] - <date>`, add a fresh empty `## [Unreleased]`, and add the compare links at the bottom.
3. Run `npm run build` (the WordPress zip picks up the new version), then `npm run test`, `check`, `lint`, `format:check`, `test:e2e` and `test:local` ([test strategy](../testing/test-strategy.md)). Merge the PR into `dev`.
4. Merge a `dev` → `main` PR. Tag main's merge commit: `git tag -a vX.Y.Z -m "We Love Cookies X.Y.Z" <sha>`, then `git push origin vX.Y.Z`.
5. `gh release create vX.Y.Z --title vX.Y.Z --notes-file <the CHANGELOG section> dist/welovecookies.min.js dist/welovecookies.mjs dist/welovecookies-wordpress.zip`.
6. Fast-forward `dev` to `main` and push it, so the branches are 0 commits apart.
