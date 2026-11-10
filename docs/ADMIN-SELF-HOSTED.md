# Optional admin on your own server (Node or Docker)

The [optional admin](ADMIN.md) also runs without Cloudflare: one Node.js process and one SQLite file, on any server you control (a VPS, a home server, a container platform). The pages, the endpoints, the script tag it gives you and the data it keeps are the same as on Cloudflare; only the hosting differs.

> Engineering defaults, not legal advice. The admin helps you keep records and answer requests; it does not make a website compliant by itself.

**Pick this if** you'd rather not use Cloudflare, or you already run servers. **Pick [Cloudflare](ADMIN.md) if** you want nothing to patch or back up yourself. **Need neither?** Send the banner's records to an endpoint you already run: [RECORDS.md](RECORDS.md).

## What you need

- A server with **Node.js 22.13 or newer** (for the built-in `node:sqlite`), or **Docker** with Compose.
- A **domain or subdomain** for the admin, like `consent.example.com`, pointing at the server.
- **HTTPS.** Browsers only keep the sign-in cookie over HTTPS (or on `localhost`). The Docker setup below gets a certificate automatically with Caddy.

What it stores and for how long is the same as on Cloudflare: see [What it stores](ADMIN.md#what-it-stores). In your privacy policy, name the company that hosts your server as the provider.

## Option 1: Docker Compose (recommended)

This runs the admin and [Caddy](https://caddyserver.com/) (automatic HTTPS) together. Ports 80 and 443 must be free and reachable from the internet, and your domain's DNS must point at the server.

```sh
git clone <this repository> welovecookies && cd welovecookies
cp admin/.env.example admin/.env
```

Edit `admin/.env`:

- `WLC_DOMAIN`: the admin's domain, like `consent.example.com`
- `ADMIN_PASSWORD`: at least 12 characters you don't use anywhere else
- `SESSION_SECRET`: at least 32 random characters, for example from `openssl rand -base64 48`

Then start it:

```sh
docker compose -f admin/compose.yaml up -d --build
```

Open `https://<your domain>/admin`, sign in, and connect your websites as in [steps 5 and 6 of the Cloudflare guide](ADMIN.md#set-it-up-about-10-minutes), using your domain in the script tag:

```html
<script src="https://consent.example.com/welovecookies.min.js" data-site="ws_xxxxxxxxxxxx" async></script>
```

The database lives in the `wlc-data` Docker volume (`/data/welovecookies.db` inside the container). Logs: `docker compose -f admin/compose.yaml logs -f admin`.

## Option 2: Node without Docker

From the repository folder:

```sh
npm ci
cp admin/.env.example admin/.env     # set WLC_PUBLIC_URL, ADMIN_PASSWORD, SESSION_SECRET
npm run admin:node
```

`npm run admin:node` bundles the admin into `admin/node-dist/` and starts it on `127.0.0.1:8787`, with the database at `admin/data/welovecookies.db`. Set `WLC_PUBLIC_URL` to the address people use, like `https://consent.example.com`, and put your own reverse proxy (Caddy, nginx, Apache) in front for HTTPS, with `WLC_TRUST_PROXY=1`. To keep it running, use your usual process manager (systemd, pm2, a container platform). Run `npm run admin:node:build` once, then start `node --disable-warning=ExperimentalWarning admin/node-dist/server.mjs`.

To try it on your own computer, `WLC_PUBLIC_URL=http://localhost:8787` works in Chrome and Firefox (they allow the sign-in cookie on `localhost`).

## Settings

Set these in the environment or in `admin/.env` (values already in the environment win).

| Variable | What it does | Default |
| --- | --- | --- |
| `WLC_PUBLIC_URL` | **Required.** The admin's public address, origin only (`https://consent.example.com`). Links and banner endpoints are built from it, never from the request's Host header. Compose sets it from `WLC_DOMAIN`. | none |
| `ADMIN_PASSWORD` | Your sign-in password, at least 12 characters | none (shows "Finish setting up") |
| `SESSION_SECRET` | At least 32 random characters. Changing it signs you out everywhere. | none |
| `WLC_TRUST_PROXY` | `1` when a reverse proxy you run sits in front: the visitor's address is read from the **last** `X-Forwarded-For` entry. Leave it off when visitors reach Node directly. | off (Compose: on) |
| `WLC_COUNTRY_HEADER`, `WLC_REGION_HEADER` | Headers that carry the visitor's country and state/region, set by a proxy or CDN you control. See [Visitor location](#visitor-location). | off |
| `WLC_DB_PATH` | The SQLite file | `admin/data/welovecookies.db` (Docker: `/data/welovecookies.db`) |
| `PORT`, `WLC_HOST` | Where Node listens | `8787`, `127.0.0.1` (Docker: `0.0.0.0`) |
| `WLC_SCRIPT_PATH` | The banner file served at `/welovecookies.min.js` | `dist/welovecookies.min.js` |

## Visitor location

On Cloudflare, the admin learns each visitor's country and US state from the connection and picks the matching banner rules. A plain server doesn't know where visitors are, so **without a location header every visitor gets the strictest rules** (ask first, like in the EU). That is always allowed, just stricter than needed in places like the US.

If a CDN or proxy you control adds location headers, tell the admin their names:

| In front of the admin | `WLC_COUNTRY_HEADER` | `WLC_REGION_HEADER` |
| --- | --- | --- |
| Cloudflare (proxied DNS, with the "Add visitor location headers" managed transform) | `cf-ipcountry` | `cf-region-code` |
| Vercel | `x-vercel-ip-country` | `x-vercel-ip-country-region` |
| Amazon CloudFront (with the viewer location headers enabled) | `cloudfront-viewer-country` | `cloudfront-viewer-country-region` |

Only set these when **every** request passes through that CDN or proxy and it overwrites the headers. Otherwise a visitor could send their own value and get a lighter banner (for themselves only).

When another proxy sits in front of your own reverse proxy, also make sure the last `X-Forwarded-For` entry is still the visitor's address, not the CDN's. With Caddy, list the CDN's address ranges in the global `trusted_proxies` option and add `header_up X-Forwarded-For {client_ip}` inside `reverse_proxy`.

## Backups

The whole admin is one SQLite file. Make a consistent copy while the server runs:

```sh
# Docker
docker compose -f admin/compose.yaml exec admin node admin/node-dist/server.mjs backup /data/backup-$(date +%F).db
docker compose -f admin/compose.yaml cp admin:/data/backup-$(date +%F).db ./
# Node
node admin/node-dist/server.mjs backup ~/wlc-backup-$(date +%F).db
```

The copy is checked before the command reports success, and an existing file is never overwritten. Before an update adds a database change, the admin also saves `<database>.pre-<migration>.bak` next to the database automatically.

- **Run it on a schedule** (cron or a systemd timer), and **copy the files off the server**: a backup on the same disk is lost with the disk. Keep them private: they contain consent records and request emails.
- **Test a restore** before you rely on it: start a second copy of the admin with `WLC_DB_PATH` pointing at a backup and a different `PORT`, and check your records are there.
- **To restore**: stop the admin, replace the database file with the backup (and delete any `-wal` and `-shm` files beside it), then start it again.
- Don't copy the live `.db` file with `cp` while the admin runs; use the backup command.
- The admin creates its database folder readable only by its own user (`0700`). Backups you write elsewhere need the same care.

## Update

```sh
git pull
docker compose -f admin/compose.yaml up -d --build   # Docker
npm ci && npm run admin:node                          # Node: then restart your process manager
```

Database changes ship as new numbered files in `admin/migrations/`. On start, the admin backs up the database and applies them, each in a transaction (a failed one is rolled back and the admin does not start). It refuses a database made by a newer version, so to go back to an older version, restore the backup taken before the update.

## Good to know

- **Run one copy.** SQLite allows one writing process, and the rate limits are kept in memory. For more traffic, give the one process a bigger server.
- **Rate limits** work as on Cloudflare: about 120 calls a minute per visitor IP to the public endpoints (per process), plus the sign-in and request-form limits. Request bodies over 1 MB are refused.
- **The daily job** (5-year retention purge and the tracking check) runs inside the process at 03:17 UTC. If it hasn't run for 2 days, the Overview shows a red warning.
- **Logs:** the admin writes to standard output and errors to standard error. With Docker: `docker compose -f admin/compose.yaml logs -f admin`. Without Docker, read them where your process manager keeps them, for example `journalctl -u <your service>` (systemd) or `pm2 logs`.
- **Health check:** `GET /health` answers `ok` (200) when the database works and 503 when it doesn't. The Docker image uses it; point an uptime monitor at it too.
- **Extra protection:** restrict `/admin*` at your reverse proxy (an IP allow-list or single sign-on) as a second lock. Leave `/api/*`, `/privacy/*` and `/welovecookies.min.js` open: visitors' browsers need them.
- **Moving between Cloudflare and your own server** isn't automated. Websites keep working if you add them again in the new admin and update their script tags; records stay in the old admin.

Code: `admin/src/node/` (HTTP and process) and `admin/src/sqlite.ts` (database). Decision: [ADR 0008](decisions/0008-self-hosted-admin.md).
