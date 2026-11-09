# 0004. The consent cookie format is a fixed contract

Date: 2026-11-09

## Status

Accepted

## Context

Each visitor's choice lives in the `wlc_consent` cookie. A server can read it too. If the cookie can't be read, the visitor is asked again.

## Decision

The value is `1.<id>.<at base36>.<rev>.<mode code>.<pam bits>.<action code>` (`cookie.ts`). Anything malformed reads as "no choice". The leading `1` is the format version. Changing the layout, `MODE_CODE`, `ACTION_CODE` or the cookie name needs a new version and a deliberate re-ask.

## Consequences

**Positive:**
- Small cookie, readable by the browser and by servers.
- Bad values fail safe (asked again).

**Negative:**
- Any change asks every visitor again.

**Neutral:**
- `contract.test.ts` pins the format.

## Alternatives Considered

### Alternative: JSON in the cookie
Longer, needs escaping, and is no easier to keep stable.

---

*Linked from:* `src/lib/consent/cookie.ts`, `src/lib/consent/contract.test.ts`
