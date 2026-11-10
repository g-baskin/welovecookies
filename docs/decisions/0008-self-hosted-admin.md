# 0008. The optional admin can also run on the owner's own server

Date: 2026-11-09

## Status

Accepted. Amends [0007](0007-admin-on-cloudflare.md).

## Context

ADR 0007 put the admin on each buyer's own Cloudflare account and named "no other host is supported" as a cost. Buyers without Cloudflare, or who already run servers, had no way to use the admin, and no guide for keeping records on a server they already run. The admin was already mostly portable: `route(request, env)` is plain fetch-style code and `Db` (`admin/src/db.ts`) is a small interface the tests already ran on `node:sqlite`.

## Decision

The same admin code also runs as one Node.js process (22.13+) with a SQLite file (`admin/src/node/`, `admin/src/sqlite.ts`), started with `npm run admin:node` or the Docker image (`admin/Dockerfile`, with Caddy for HTTPS in `admin/compose.yaml`). The Node runtime supplies what Cloudflare would: the public origin from `WLC_PUBLIC_URL` (never the Host header), the visitor's IP from the socket or, when `WLC_TRUST_PROXY=1`, the last `X-Forwarded-For` entry (any visitor-sent `cf-connecting-ip` is replaced), visitor location only from headers the owner names (`WLC_COUNTRY_HEADER`/`WLC_REGION_HEADER`), an in-memory rate limiter, the banner file and a 03:17 UTC daily timer. Without a location header every visitor gets `opt-in` (ADR 0002).

Migrations are applied by the runtime itself (`migrate()`), tracked in a `wlc_migrations` table, each in a transaction, after a `VACUUM INTO` backup of an existing file. The tests use the same code, so the hand-kept migration list is gone. Owners who want no admin at all get `docs/RECORDS.md`: the record endpoint contract and short receivers.

## Consequences

**Positive:**
- Buyers can host the admin anywhere Node or Docker runs; Cloudflare stays a supported option with unchanged code.
- One schema and one set of routes for both hosts; tests exercise the self-hosted database code.

**Negative:**
- Self-hosting owners patch, secure and back up their own server; the docs cover HTTPS, backups and restores.
- Region rules are only as precise as the location headers the owner provides; without them banners are stricter than needed.
- One process only (SQLite writer, in-memory limits).

**Neutral:**
- The Worker bundle doesn't import the Node files; `dist/` and the banner are unchanged.
- No data migration between the two hosts is provided.

## Alternatives Considered

### Alternative: Keep Cloudflare only
Leaves out buyers who can't or won't use Cloudflare.

### Alternative: Run the Worker with workerd or wrangler on the buyer's server
Ties self-hosting to Cloudflare's tooling and a local D1 emulation not meant for production.

### Alternative: A separate Node app or a web framework
Two codebases to keep in step, and heavier dependencies.

---

*Linked from:* `docs/ADMIN-SELF-HOSTED.md`, `docs/ADMIN.md`
