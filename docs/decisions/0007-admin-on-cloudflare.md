# 0007. The optional admin runs on the owner's Cloudflare account

Date: 2026-11-09

## Status

Accepted

## Context

Buyers asked for the owner screens back: answer rates, proof-of-consent records with an export, banner and cookie-list settings, privacy requests and a compliance check, for one or several websites. ADR 0006 keeps the product a single script tag, so anything that needs a server must stay optional. The admin stores personal data (consent records, request emails), so who hosts it matters.

## Decision

The admin is a Cloudflare Worker with a D1 database (`admin/`) that each buyer deploys to their own account. It serves the banner script for the hosted install (`data-site`), answers the config, record and seen endpoints, hosts an "Ask about your data" form, renders server-side HTML admin pages that work without JavaScript, and runs a daily job (5-year retention purge and the tracking check). It imports the rules from `src/lib/consent/`, so there is one source of truth. The region mode comes from `request.cf` via `modeFor()`.

## Consequences

**Positive:**
- Each buyer controls their own data; the author never processes it.
- The location comes from the connection, so region rules are more accurate than the browser's time-zone guess.
- Cloudflare's free tier covers small sites, and there are no servers to patch.

**Negative:**
- The admin needs a Cloudflare account; no other host is supported.
- No email notifications (Workers would need a separate mail provider).

**Neutral:**
- Sites without the admin keep the plain script tag; the banner code is unchanged.

## Alternatives Considered

### Alternative: A hosted service run by the author
The author would process every buyer's visitor data and have to run the service forever.

### Alternative: A Node server with SQLite, or a full web framework
More for buyers to install, patch and back up, and heavier dependencies.

---

*Linked from:* `docs/ADMIN.md`, `README.md`
