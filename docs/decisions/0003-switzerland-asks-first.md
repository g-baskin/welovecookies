# 0003. Switzerland asks first

Date: 2026-11-09

## Status

Accepted

## Context

The law research (`docs/privacy/consent-law-matrix.md`) reads Switzerland's nFADP as allowing opt-out, based on vendor guides. Guides disagree, and the federal regulator's own guidance was not checked.

## Decision

We map Switzerland (`CH`) to `opt-in` in `regions.ts`, against the matrix's reading.

## Consequences

**Positive:**
- No exposure if Swiss authorities read the law as requiring consent.

**Negative:**
- Swiss visitors see the full banner, and fewer of them allow tracking.

**Neutral:**
- `regions.ts` is the source of truth; the matrix row records the research, not the behaviour.

## Alternatives Considered

### Alternative: Follow the matrix (opt-out)
Rests on unverified vendor readings, so it was not adopted.

---

*Linked from:* `src/lib/consent/regions.ts` (COUNTRY_MODES)
