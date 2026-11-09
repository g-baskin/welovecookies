# 0002. Unknown or unlisted places get the strictest treatment

Date: 2026-11-09

## Status

Accepted

## Context

The visitor's location is often missing or wrong: no country header, VPNs, and browser time zones that only hint at a region. Showing too little consent risks fines and lawsuits. Showing too much costs a few extra clicks.

## Decision

When the place is unknown or not in the table, we pick the strictest sensible rule: an unknown or unlisted country is `opt-in` (`DEFAULT_MODE`), a US visitor without a known state is `opt-out-gpc` (`US_DEFAULT_MODE`), `mode: 'auto'` falls back to `opt-in` for unrecognised time zones, and the wiretap rule treats an unknown place or US state as needing an explicit Accept.

## Consequences

**Positive:**
- A missing or wrong location never results in tracking without consent.

**Negative:**
- Some visitors from lenient places see a full banner, and fewer of them allow tracking.

**Neutral:**
- Sites with reliable country data (a CDN header) can pass the exact mode and avoid the fallback.

## Alternatives Considered

### Alternative: Default to notice-only
Fewer banners, but it would track visitors from opt-in countries whenever detection fails.

---

*Linked from:* `src/lib/consent/regions.ts`, `src/lib/consent/wiretap.ts`
