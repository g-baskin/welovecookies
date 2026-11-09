# We Love Cookies: consent banner core

A framework-free cookie consent banner, preferences panel and consent manager. Any site can load it with one script tag, or bundle it as a module. This folder only uses relative imports, so you can copy it as a whole.

> Engineering defaults, not legal advice. Have the region table (`regions.ts`) and your texts checked for your business.

## Files

| File                                  | What it does                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `types.ts`, `regions.ts`, `cookie.ts` | Shared contract: config, region modes, cookie wire format (shared with the server)                 |
| `i18n.ts`, `i18n/*.ts`                | Built-in texts for 20 languages: en es fr de it pt nl pl sv da nb fi ja ko zh tr ar (RTL) th vi id |
| `device.ts`                           | `deviceOf(width, userAgent, maxTouchPoints)` gives phone, tablet or desktop                        |
| `signals.ts`                          | Google Consent Mode v2, Microsoft UET, Meta, TikTok, PostHog, dataLayer event, script unblocking   |
| `ui.ts`, `ui-css.ts`                  | Shadow DOM banner, preferences panel, floating button                                              |
| `autoclear.ts`                        | Built-in list of tracking cookie names per category; deletes them when a category is off           |
| `consent.ts`                          | `createConsent(config, options)`: the manager                                                      |
| `standalone.ts`                       | `window.WeLoveCookies` for the script-tag build                                                       |
| `svelte/CookieConsent.svelte`         | Thin Svelte 5 wrapper                                                                              |
| `wiretap.ts`                          | US all-party-consent states; when an identifying or session-recording tag needs an explicit Accept |

## Build

`npm run build` writes `dist/welovecookies.min.js` (IIFE) and `dist/welovecookies.mjs` (ESM), prints their gzip sizes and packages the WordPress plugin as `dist/welovecookies-wordpress.zip`. Demo: `npm run demo`, then open `/demo/?mode=opt-in|opt-out-gpc|opt-out|notice&lang=de&gpc=1&prefs=1`.

## Any site: one script tag

Put the tag **before** your analytics and ad tags. Consent defaults (Google, UET) are set as soon as it runs.

```html
<script>
	window.WeLoveCookiesConfig = { mode: 'auto', rev: 1, links: { privacyPolicy: '/privacy' } };
</script>
<script src="/welovecookies.min.js"></script>
```

You can also use data attributes: `data-mode`, `data-rev`, `data-lang`, `data-position`, `data-floating`, `data-preferences`, `data-avoid`, `data-gpc`, `data-record`, `data-seen`, `data-privacy`, `data-cookies-page`, `data-choices`, and `data-auto="false"` to call `WeLoveCookies.init(config)` yourself. `mode: 'auto'` guesses the region from the browser time zone and falls back to opt-in.

### Config (see `ConsentConfig` in types.ts)

`mode`, `rev` (raise it to ask everyone again), `lang`, `texts` (`{'*': {...}, de: {...}}` overrides), `theme` (bg, fg, primary... falls back to the page's `--color-*`, `--radius-theme`, `--radius-button`, `--font-body`), `position`, `preferencesCategory`, `floatingButton`, `noticeBanner`, `cookies` (the list shown per category), `links`, `endpoints.record` / `endpoints.seen` (POST JSON), `cookieName` (default `wlc_consent`), `cookieDomain`, `integrations` (each one is on by default), `compactOn` (path prefixes), `avoidSelector` (a fixed bottom bar to sit above, e.g. `[data-sticky-cta]`).

### Hosted install (config from your server)

```html
<script src="https://YOUR-SERVER/welovecookies.min.js" data-site="SITE_KEY" async></script>
```

With `data-site`, Google Consent Mode and Microsoft UET default to denied at once. Then the script fetches `/api/consent/config?site=SITE_KEY` from the server that serves it (no cookies, CORS) and starts with that config. Every record and seen request carries the site key. If the fetch fails, the banner still works in `auto` mode and nothing is logged. Cross-origin requests use CORS without cookies or keepalive.

### Auto-clear

When a category is off (after any save, Reject all, withdraw, GPC, and once at start-up), its known cookies and storage keys are deleted. This covers Google Analytics, PostHog, Clarity, Hotjar, Matomo, Mixpanel and Segment for analytics, and Meta, TikTok, Google Ads, Microsoft Ads, Pinterest, Snap, Reddit and LinkedIn for marketing. It works for path `/` and the current path, for the host and every parent domain. Add your own names with `autoClear: { marketing: ['my_ad*'] }` (a trailing `*` matches the start of a name). The choice cookie is never touched.

### One choice for the whole domain

`cookieDomain: 'auto'` (default) finds the root domain with a short test cookie, so a choice made on blog.example.com also counts on example.com. localhost and IP addresses use host-only cookies. A domain string is used as given. Before the domain cookie is written, any host-only copy is removed. If two copies exist anyway, the newest one wins.

### Logo

`logoUrl` (and `brandName` for its alt text) shows your logo in place of the cookie picture on the banner, and small in the preferences header. If the image fails to load, the cookie picture comes back. Demo: `?logo=1`.

### Privacy note

People only see plain words. Technical cookie names are never displayed: they live only in code, such as the auto-clear list. Give `cookies` entries plain names, like "Shopping bag".

### Script blocking

```html
<script type="text/plain" data-consent="analytics" data-src="https://example.com/a.js"></script>
<script type="text/plain" data-consent="marketing">
	/* inline code */
</script>
```

Once the category is allowed, each script is cloned into a real script. This happens once per page and never twice.

### Integrations

- **Google Consent Mode v2:** `consent default` (with `wait_for_update: 500`) at init from the mode defaults, then `consent update` when a choice exists and on every change. ad_storage, ad_user_data and ad_personalization follow marketing. analytics_storage follows analytics. personalization_storage follows preferences. functionality_storage and security_storage are always granted. The script creates `dataLayer` and `gtag` if they are missing.
- **Microsoft UET:** `uetq.push('consent', 'default' | 'update', { ad_storage })`.
- **Meta:** `fbq('consent', 'grant' | 'revoke')`. **TikTok:** `ttq.holdConsent / grantConsent / revokeConsent`.
- **PostHog:** uses the instance you pass in or `window.posthog`. Analytics on calls `opt_in_capturing()`. Analytics off calls `reset()` + `opt_out_capturing()` if the visitor had opted in. While the choice is pending, PostHog is left alone. Initialise PostHog with `cookieless_mode: 'on_reject'` and `opt_out_capturing_by_default: true`. The core never imports posthog-js.
- `dataLayer.push({ event: 'welovecookies_update', preferences, analytics, marketing })`.

### Events and API

`window` gets a `welovecookies:change` CustomEvent (`detail` = state). `WeLoveCookies.init(config?)` returns the manager:
`get()` → `{ mode, grants, stored, gpc, lang, device }`, `onChange(cb)` → unsubscribe, `acceptAll()`, `rejectAll()`, `save(grants)`, `acknowledge()`, `openPreferences()` (link your footer's "Cookie settings" to it), `showBanner()`, `destroy()`.

### Behaviour

- **Opt-in regions:** full banner with Accept all and Reject all styled identically, plus Choose. Every switch starts off. There is no X and no backdrop.
- **Opt-out and notice regions:** short notice with OK, Choose and Do Not Sell where the law asks for it.
- **GPC** (`navigator.globalPrivacyControl` or `config.gpc`) always turns marketing off. In opt-out regions with no choice yet, it is saved silently with action `gpc` so there is proof.
- Turning everything off after allowing something records `withdraw`.
- **Network:** the banner closes synchronously. Vendor signals and the record POST (`keepalive`, path only) run after it. The server's corrected `consent` is adopted. The seen POST is sent once per page load.

## With a server or a framework

A server can build the config per request (for example with the visitor's country from a CDN header) and pass it to `WeLoveCookies.init(config)`, `createConsent(config)` or the Svelte wrapper `<CookieConsent {config} {posthog} onready={(m) => ...} />`. To keep proof of consent, point `endpoints.record` at an endpoint that stores the `ConsentRecordPayload` JSON (see `types.ts`).
