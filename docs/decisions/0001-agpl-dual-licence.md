# 0001. Licence under AGPL-3.0-only and sell commercial licences

Date: 2026-11-09

## Status

Accepted

## Context

We Love Cookies is sold, but the repository is public. The owner wants anyone who changes it or sells it as a service to share their code. The banner runs in visitors' browsers, so every website using it serves the code to its visitors.

## Decision

We license the code under the GNU AGPL-3.0-only (`LICENSE`, verbatim from gnu.org) and offer separate commercial licences from the copyright holder (g-baskin). The build puts a one-line licence and source comment at the top of every `dist/` file.

## Consequences

**Positive:**
- Modified versions and hosted services must share their source with their users.
- Companies that won't share can buy a commercial licence.

**Negative:**
- Some companies avoid AGPL code entirely.
- Outside contributions need an agreement that lets the owner also license them commercially; without it, dual licensing breaks for those parts.

**Neutral:**
- "only" (not "or later") keeps future licence versions from changing the terms automatically.

## Alternatives Considered

### Alternative: All rights reserved
Used briefly. Gave no terms to the public, so it neither allowed use nor required sharing changes.

### Alternative: SSPL
Requires publishing a whole service's code. Not recognised as open source, and many companies refuse it.

### Alternative: MPL-2.0
Only changed files must be shared. Too weak for the "sell it as a service" case.

---

*Linked from:* PR #6, `LICENSE`, `tools/build-consent.mjs`
