# 0006. One script tag for any website; WordPress is optional

Date: 2026-11-09

## Status

Accepted

## Context

The product must work on any website: plain HTML, every major framework and site builders. The owner was explicit that it is not a WordPress plugin.

## Decision

The core product is `dist/welovecookies.min.js`, loaded with one script tag in the page `<head>`. The README and install guide lead with that and give per-framework steps. The ES module and the WordPress plugin are extra install paths built from the same code.

## Consequences

**Positive:**
- One install story for every site.

**Negative:**
- Features that need a server must stay optional and can't be assumed.

**Neutral:**
- The WordPress plugin is a thin wrapper that prints the same script tag.

## Alternatives Considered

### Alternative: Framework packages or a WordPress-first plugin
More to maintain, and it would tie the product to specific platforms.

---

*Linked from:* `README.md`, `docs/INSTALL.md`, PR #4
