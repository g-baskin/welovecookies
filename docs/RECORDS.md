# Keep records on your own server

Proof of consent doesn't need the [optional admin](ADMIN.md). The banner can send each choice to an address on a server you already run, and you store it however you like. Nothing else changes: the plain script tag, your settings and the banner stay the same.

> Engineering defaults, not legal advice. Ask your lawyer what you need to keep and for how long.

## Turn it on

Give the banner the address of your endpoint, on the script tag or in `window.WeLoveCookiesConfig`:

```html
<script src="/welovecookies.min.js" data-record="/api/consent" async></script>
```

```html
<script>
	window.WeLoveCookiesConfig = { endpoints: { record: '/api/consent' } };
</script>
```

There is also `endpoints.seen` (`data-seen`), which receives one cookieless count each time a banner is shown, if you want answer rates.

## What your endpoint receives

After every choice, the banner sends `POST <your address>` with `Content-Type: application/json` and a body like this (`ConsentRecordPayload` in `src/lib/consent/types.ts`):

```json
{
	"id": "Xk3q9TmA2bLpQz7w",
	"action": "reject_all",
	"grants": { "preferences": false, "analytics": false, "marketing": false },
	"mode": "opt-in",
	"rev": 1,
	"lang": "de",
	"device": "phone",
	"gpc": false,
	"page": "/pricing"
}
```

| Field | Meaning |
| --- | --- |
| `id` | The consent reference: 16 random characters, also kept in the visitor's `wlc_consent` cookie. Use it to find a visitor's record when they ask. |
| `action` | `accept_all`, `reject_all`, `custom`, `acknowledge`, `withdraw` or `gpc` |
| `grants` | Which optional categories are allowed |
| `mode` | The region rules the banner used (`opt-in`, `opt-in-uk`, `opt-in-light`, `opt-out-gpc`, `opt-out`, `notice`) |
| `rev` | Your banner version (`rev` setting). Raise it to ask everyone again. |
| `lang`, `device` | Banner language, and `phone`, `tablet` or `desktop` |
| `gpc` | Whether the browser sent Global Privacy Control |
| `page` | The page path, never the query string |

The `seen` body is `{ "mode": "...", "device": "...", "lang": "..." }`. The exact formats are in [`docs/api/openapi.json`](api/openapi.json) ("Own endpoint contract").

## What to send back

**Nothing is required.** The banner saves the choice in the visitor's browser and closes before it sends the record, so a slow, failing or missing endpoint never gets in the way. Reply `204 No Content` (or any 2xx).

Optionally, your server may correct the saved choice, for example to switch marketing off when `gpc` is `true`. Reply `200` with JSON `{ "ok": true, "consent": { "id", "at", "mode", "rev", "grants", "action" } }` (`StoredConsent`) using the **same `id`**, and the browser adopts it. Any other reply is ignored.

## Same address or another one

- **Same origin** (a path like `/api/consent`, or an address on the site's own domain): nothing extra. The banner sends the request with `keepalive`, so it still arrives when the visitor leaves the page.
- **Another origin** (like `https://records.example.net/consent`): the browser first sends an `OPTIONS` preflight. Answer it, and the `POST`, with:

  ```
  Access-Control-Allow-Origin: https://example.com
  Access-Control-Allow-Methods: POST
  Access-Control-Allow-Headers: content-type
  Access-Control-Max-Age: 86400
  Vary: Origin
  ```

  Allow only your own site's address, never `*` with credentials. The banner never sends cookies to another origin.

## What to store, and for how long

- Store each record with the time **you** received it, plus the fields above. The browser's user agent (shortened) is useful too. **Don't store IP addresses**: you don't need them to prove consent.
- Keep a copy of **what your banner said and which cookies it listed** for each `rev`, so a record can show what the visitor saw.
- Keep records as long as you might need to prove consent, then delete them. The optional admin keeps them for **5 years**; schedule a job that deletes older ones.
- Treat everything sent as untrusted: check the types and lengths, and cap the body size (records are well under 1 KB).
- Mention the records in your privacy policy.

## Example receivers

Each one appends a line of JSON to a file kept **outside your web root**. That is enough to start; use your own database when you have one.

### Node.js (no packages)

```js
// consent-records.mjs: node consent-records.mjs, then proxy /api/consent on your site to port 3000
import { createServer } from 'node:http';
import { appendFile } from 'node:fs/promises';

const ACTIONS = ['accept_all', 'reject_all', 'custom', 'acknowledge', 'withdraw', 'gpc'];
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

async function record(req, res) {
	if (req.method !== 'POST' || req.url !== '/api/consent') return res.writeHead(404).end();
	let body = '';
	for await (const chunk of req) {
		body += chunk;
		if (body.length > 8192) return res.writeHead(413).end();
	}
	let r;
	try {
		r = JSON.parse(body);
	} catch {
		return res.writeHead(400).end();
	}
	if (typeof r?.id !== 'string' || r.id.length !== 16 || !ACTIONS.includes(r.action))
		return res.writeHead(400).end();
	const g = r.grants ?? {};
	const row = {
		at: new Date().toISOString(),
		id: r.id,
		action: r.action,
		preferences: g.preferences === true,
		analytics: g.analytics === true,
		marketing: g.marketing === true,
		mode: str(r.mode, 16),
		rev: Number.isInteger(r.rev) ? r.rev : 0,
		lang: str(r.lang, 12),
		device: str(r.device, 8),
		gpc: r.gpc === true,
		page: str(r.page, 200),
		userAgent: str(req.headers['user-agent'], 200)
	};
	await appendFile('consent-records.jsonl', JSON.stringify(row) + '\n');
	res.writeHead(204).end();
}

// A dropped connection or a full disk fails only that request, never the whole receiver.
createServer((req, res) =>
	record(req, res).catch((err) => {
		console.error('consent record failed:', err.message);
		if (!res.headersSent) res.writeHead(500);
		res.end();
	})
).listen(3000, '127.0.0.1');
```

### PHP

```php
<?php
// api/consent.php, with data-record="/api/consent.php"
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
$body = file_get_contents('php://input', false, null, 0, 8193);
if (strlen($body) > 8192) { http_response_code(413); exit; }
$r = json_decode($body, true);
$actions = ['accept_all', 'reject_all', 'custom', 'acknowledge', 'withdraw', 'gpc'];
if (!is_array($r) || !is_string($r['id'] ?? null) || strlen($r['id']) !== 16
	|| !in_array($r['action'] ?? null, $actions, true)) { http_response_code(400); exit; }
$g = is_array($r['grants'] ?? null) ? $r['grants'] : [];
$str = fn($v, $max) => is_string($v) ? substr($v, 0, $max) : '';
$row = [
	'at' => gmdate('c'),
	'id' => $r['id'],
	'action' => $r['action'],
	'preferences' => ($g['preferences'] ?? false) === true,
	'analytics' => ($g['analytics'] ?? false) === true,
	'marketing' => ($g['marketing'] ?? false) === true,
	'mode' => $str($r['mode'] ?? null, 16),
	'rev' => is_int($r['rev'] ?? null) ? $r['rev'] : 0,
	'lang' => $str($r['lang'] ?? null, 12),
	'device' => $str($r['device'] ?? null, 8),
	'gpc' => ($r['gpc'] ?? false) === true,
	'page' => $str($r['page'] ?? null, 200),
	'userAgent' => $str($_SERVER['HTTP_USER_AGENT'] ?? null, 200),
];
// One folder above the web root, so the file can't be downloaded.
file_put_contents(dirname(__DIR__, 2) . '/consent-records.jsonl', json_encode($row) . "\n", FILE_APPEND | LOCK_EX);
http_response_code(204);
```

### Python (Flask)

```python
# consent.py: pip install flask, then flask --app consent run (behind your web server)
import json
from datetime import datetime, timezone
from flask import Flask, request

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8192
ACTIONS = {"accept_all", "reject_all", "custom", "acknowledge", "withdraw", "gpc"}


def text(v, limit):
    return v[:limit] if isinstance(v, str) else ""


@app.post("/api/consent")
def record():
    r = request.get_json(silent=True)
    if not isinstance(r, dict) or not isinstance(r.get("id"), str) or len(r["id"]) != 16 \
            or r.get("action") not in ACTIONS:
        return "", 400
    g = r.get("grants") if isinstance(r.get("grants"), dict) else {}
    row = {
        "at": datetime.now(timezone.utc).isoformat(),
        "id": r["id"],
        "action": r["action"],
        "preferences": g.get("preferences") is True,
        "analytics": g.get("analytics") is True,
        "marketing": g.get("marketing") is True,
        "mode": text(r.get("mode"), 16),
        "rev": r["rev"] if type(r.get("rev")) is int else 0,
        "lang": text(r.get("lang"), 12),
        "device": text(r.get("device"), 8),
        "gpc": r.get("gpc") is True,
        "page": text(r.get("page"), 200),
        "userAgent": text(request.headers.get("User-Agent"), 200),
    }
    with open("consent-records.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(row) + "\n")
    return "", 204
```

To find someone's record, ask for their consent reference (in their `wlc_consent` cookie: the 16 characters after `1.`) and search the file for it.

Want answer rates, a lookup page and a request form without writing code? Use the optional admin on [Cloudflare](ADMIN.md) or [your own server](ADMIN-SELF-HOSTED.md).
