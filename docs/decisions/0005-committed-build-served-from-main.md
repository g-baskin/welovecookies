# 0005. Built files are committed and served from `main`

Date: 2026-11-09

## Status

Accepted

## Context

Buyers should be able to download one file, or load it from a CDN, without installing anything or running a build.

## Decision

`dist/` (the script, the module and the WordPress zip) is committed. The install guide's jsDelivr address serves `dist/` straight from GitHub's `main` branch. Feature work goes to `dev`, and `main` is the release branch.

## Consequences

**Positive:**
- Download-and-upload works from the repository with no tooling.

**Negative:**
- After any change to `src/lib/consent/`, `npm run build` must run and `dist/` must be committed. No test checks this.
- Sites on `@main` change when `main` changes until version tags are published.

**Neutral:**
- Version tags (`@v1.0.1`) are the planned way to pin a release.

## Alternatives Considered

### Alternative: Publish to npm only
Needs a build step for buyers and doesn't help plain HTML sites.

## Notes

- 2026-11-09: `src/lib/consent/dist.test.ts` now fails when the committed `welovecookies.min.js` or `welovecookies.mjs` differs from a fresh build, so "No test checks this" above no longer holds for the two scripts. The WordPress zip is still not compared, and `dist/` must still be rebuilt and committed. The decision itself is unchanged.
- 2026-11-09: Version tags are now published, starting with `v1.1.0` (with `v1.0.0` and `v1.0.1` tagged afterwards at the commits that set them), each with a GitHub Release. Sites can pin `@vX.Y.Z`; `@main` still follows every release.

---

*Linked from:* `tools/build-consent.mjs`, `docs/INSTALL.md`, `src/lib/consent/dist.test.ts`
