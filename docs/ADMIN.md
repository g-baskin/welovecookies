# Optional admin

The banner works on its own with one script tag. The admin is an **optional add-on** for owners who want, in one place:

- **Overview**: how often the banner is shown and how people answer (accept, reject, choose), by region rules and device
- **Consent records**: proof of each choice, a lookup by consent reference, and a CSV download
- **Banner settings**: wording, look, position and tools, plus “ask everyone again”
- **Cookie list**: what visitors see in the preferences panel
- **Privacy requests**: a hosted “Ask about your data” form, with a list showing what is due when
- **Tracking & compliance check**: a daily list of common gaps
- **Several websites** under one admin, each with its own settings and records

It runs on infrastructure **you** control. Nobody else, including the We Love Cookies author, can see your data. Sites that don't need it keep using the plain script tag. Pick where it runs:

| | Cloudflare (this page) | Your own server ([ADMIN-SELF-HOSTED.md](ADMIN-SELF-HOSTED.md)) |
| --- | --- | --- |
| Runs as | A Worker and a D1 database on your Cloudflare account | One Node.js process and a SQLite file, or Docker with automatic HTTPS |
| You look after | Nothing beyond updates | The server, HTTPS, updates and backups |
| Visitor location for the region rules | Built in | From your CDN or proxy's headers, otherwise the strictest rules for everyone |
| Cost | Free tier covers small sites | Your server |

Don't want an admin at all? The banner can send each choice to an endpoint on a server you already run: [RECORDS.md](RECORDS.md).

> Engineering defaults, not legal advice. The admin helps you keep records and answer requests; it does not make a website compliant by itself.

## What it stores

| Data | Where | Kept |
| --- | --- | --- |
| Each choice: consent reference, time, choice and categories, region rules, country and US state or province, banner version, language, device, privacy signal, page path (no query string), browser user agent (first 200 characters) | `consent_records` | 5 years, then deleted by the daily job |
| Daily counts of banner views and answers (no cookies, no identifiers) | `consent_daily` | 5 years |
| What each banner version said and which cookies it listed | `consent_versions` | Kept as proof |
| Privacy requests: email, optional name and message, country, dates, your status and note | `privacy_requests` | Until you delete them |
| Failed sign-ins and request-form posts: a keyed hash of the IP address, the kind and the time (for rate limits) | `rate_events` | 1 day |

**No IP address is ever stored.** The country and region come from Cloudflare's view of the connection (on your own server, from the [location headers](ADMIN-SELF-HOSTED.md#visitor-location) you set up) and are used to pick the region rules.

Things to do on your side:

- Mention the consent records and the request form in your privacy policy, and name Cloudflare (or your server's hosting company) as the provider that hosts them.
- 5 years is a default (long enough to show proof of consent in most places). If your lawyer advises a different period, change `RETENTION_YEARS` in `admin/src/log.ts` and deploy.

## Set it up (about 10 minutes)

These steps are for Cloudflare. For your own server, follow [ADMIN-SELF-HOSTED.md](ADMIN-SELF-HOSTED.md) instead. You need Node 22.13 or newer, this repository, and a free Cloudflare account. Run the commands from the repository folder.

**1. Install and sign in to Cloudflare**

```sh
npm install
npx wrangler login
```

**2. Create the database**

```sh
npx wrangler d1 create welovecookies
```

Copy the `database_id` it prints into `admin/wrangler.jsonc`, replacing `00000000-0000-0000-0000-000000000000`.

**3. Deploy**

```sh
npm run admin:deploy
```

This copies the banner script, creates the tables (wrangler lists the migration and asks you to confirm), and deploys the Worker. It prints the address, like `https://welovecookies-admin.<your-subdomain>.workers.dev`. Until step 4 is done, `/admin` shows "Finish setting up".

**4. Set the password and session secret**

```sh
npx wrangler secret put ADMIN_PASSWORD -c admin/wrangler.jsonc
openssl rand -base64 48        # copy the output for the next command
npx wrangler secret put SESSION_SECRET -c admin/wrangler.jsonc
```

Use a password of at least 12 characters that you don't use anywhere else. Changing either secret later signs you out everywhere.

**5. Connect a website**

Open `https://<your-worker>/admin`, sign in, go to **Websites** and add the website's address (like `example.com`) and its privacy policy link. Copy the script tag shown there and put it in the website's `<head>` **instead of** the plain one:

```html
<script src="https://<your-worker>/welovecookies.min.js" data-site="ws_xxxxxxxxxxxx" async></script>
```

The admin's settings replace any `data-*` attributes and `window.WeLoveCookiesConfig`, so you can remove those. Keep your "Cookie settings" footer link.

**6. Link the request form**

Each website has an "Ask about your data" form at `https://<your-worker>/privacy/<site key>`. Link to it from your privacy policy. The banner's "Do Not Sell or Share" link also points there.

## Extra protection (recommended)

The admin has its own password, allows 5 wrong tries per 15 minutes, and uses session cookies that last 12 hours. Signing out removes the cookie from your browser; to end every session at once (say, on a lost laptop), set a new `SESSION_SECRET`. For a second lock, put **Cloudflare Access** (Zero Trust) in front of `/admin*` on your Worker's address, so only your email can reach the sign-in page. Leave `/api/*`, `/privacy/*` and `/welovecookies.min.js` open: visitors' browsers need them.

You can also give the Worker your own domain (Workers → your Worker → Settings → Domains & Routes).

## Good to know

- **One address per website entry.** `example.com` and `www.example.com` are different addresses. If people visit both, redirect one to the other, or add both.
- **Switching the banner off** in the admin (or disconnecting a website) makes the script fall back to its basic built-in banner, guessed from the visitor's time zone, and no records are kept. To stop the banner completely, remove the script tag.
- **No emails are sent.** Check the Requests page regularly; the overview and the daily check show overdue requests. Nothing on your website is changed or deleted automatically.
- **Headless browsers and bots** are not counted in the overview.
- **Rate limits.** Each visitor's IP may make about 120 calls a minute to the public endpoints (the `ratelimits` setting in `admin/wrangler.jsonc`; its `namespace_id` must be unique in your Cloudflare account). The request form also takes at most 5 requests per IP, 3 per email and 100 per website a day. For stronger protection, add a Cloudflare rate-limiting rule or Turnstile in front of `/privacy/*`.
- **A record keeps the banner version the visitor saw.** If you start a new version while someone has the old banner open, their answer is saved under the old version and they are asked again on their next page.
- The admin and the request form are in English. The banner itself has 20 languages.
- The tracking check is a reminder list. Some items (dated legal lists) go away when you update We Love Cookies.

## Logs

Errors from the admin and the daily job (03:17 UTC) are written to Cloudflare's logs, which `admin/wrangler.jsonc` turns on. Read them in the Cloudflare dashboard under **Workers & Pages** > **welovecookies-admin** > **Logs**, or live from your computer with `npx wrangler tail -c admin/wrangler.jsonc`. Nothing emails you when something fails, so:

- The Overview shows a red warning when the daily job hasn't run for 2 days.
- For an uptime monitor, use `GET /health`: it answers `ok` (200) when the database works and 503 when it doesn't.

## Backups

D1 keeps a history of your database: **Time Travel** can restore it to any minute in the last 7 days on the free plan, or 30 days on Workers Paid, at no extra cost (Cloudflare docs, Nov 2026). To also keep a copy outside Cloudflare:

```sh
npx wrangler d1 export welovecookies --remote --output wlc-backup.sql -c admin/wrangler.jsonc
```

Keep that file somewhere private: it contains visitors' consent records and request emails. Before you rely on a backup, restore it into a **new** database to check it works.

## Update

```sh
git pull
npm install
npm run admin:deploy
```

Database changes ship as new numbered files in `admin/migrations/` and are applied (after you confirm) before the new code goes live. Read them before confirming. Run the deploy from your own terminal: in scripts and CI, wrangler confirms migrations automatically.

## Local development

```sh
cp admin/.dev.vars.example admin/.dev.vars   # local secrets only, never commit
npm run admin:db:local                         # creates the local tables in admin/.wrangler/
npm run admin:dev                              # http://127.0.0.1:8787/admin
```

To test the banner from a local page, add `http://localhost:<port>` as a website. Locally, wrangler uses a sample location, so the region rules may not match where you are. To run the daily job by hand: `curl http://127.0.0.1:8787/cdn-cgi/local/scheduled`.

## Endpoints

| Path | Who calls it |
| --- | --- |
| `GET /welovecookies.min.js` | Visitors' browsers (the banner script) |
| `GET /api/consent/config?site=<key>` | The banner, from the website's exact address only |
| `POST /api/consent`, `POST /api/consent/seen` | The banner: a choice, and a cookieless view count |
| `GET`, `POST /privacy/<key>` | Visitors: the "Ask about your data" form |
| `GET /health` | Uptime monitors: `ok` (200), or 503 when the database fails |
| `/admin/*` | You |

Cross-origin access is allowed only for each website's exact address, never with cookies. Request and response formats, status codes and limits for the `/api/consent*` endpoints: [`docs/api/openapi.json`](api/openapi.json) (OpenAPI 3.1). Code: `admin/src/`. Decisions: [ADR 0007](decisions/0007-admin-on-cloudflare.md) (Cloudflare) and [ADR 0008](decisions/0008-self-hosted-admin.md) (your own server).
