<p align="center">
  <img src="docs/assets/hero-title.jpg" alt="We Love Cookies: cookies of every kind bursting out toward the viewer" width="100%">
</p>

<p align="center"><strong>Cookie consent that follows the law where each visitor actually is.</strong></p>

## About

We Love Cookies is a cookie consent and tracking-compliance system for online stores and websites. It works out where a visitor is and shows the banner the local rules call for: ask-first in the EU, UK, Brazil and other opt-in countries, a short notice with "Do Not Sell or Share" in US privacy-law states, and nothing intrusive where no consent is required. Analytics and ad tags stay blocked until they are allowed, Global Privacy Control is honoured, and every choice can be kept as proof of consent.

It drops into any site with one script tag, or into a JavaScript app as a module.

- **Rules for 57 countries, Quebec and every US state** (any other country gets the strict ask-first banner), backed by a dated law matrix with sources
- **US wiretap protection**: identifying and session-recording tags need an explicit Accept in all-party-consent states
- **Google Consent Mode v2, Microsoft UET, Meta, TikTok and PostHog** signals built in
- **Auto-clear**: known analytics and ad cookies are deleted the moment a category is switched off
- **20 languages** (including right-to-left Arabic), phone, tablet and desktop layouts, and themes that match your site
- **Proof of consent**: a consent log, privacy requests (delete, copy, correct, don't sell) with due dates, and one banner shared across several websites

> Engineering defaults, not legal advice. Have the rules table and banner texts reviewed for your business, and re-check them at least yearly.

## What is here

| Path | What it is |
| --- | --- |
| `src/lib/consent/` | The banner, preferences panel and consent manager (no framework). See its [README](src/lib/consent/README.md) |
| `src/lib/consent/regions.ts` | **The rules table**: consent mode per country, Canadian province and US state, and what each mode allows |
| `src/lib/consent/wiretap.ts` | US all-party-consent states and when an identifying tag needs an explicit Accept |
| `docs/privacy/` | The research behind the rules: law matrix with sources, banner UX research, how it works, privacy requests |
| `static/consent/` | Built one-file script (`welovecookies.min.js`, `welovecookies.mjs`) and `demo.html` |
| `tools/build-consent.mjs` | Rebuilds `static/consent/` from `src/lib/consent/` |
| `reference/server/` | Server side: consent log, database tables and migrations, consent API, owner screens, privacy requests, weekly tracking check. Written for SvelteKit + Cloudflare D1; it does not run on its own |

## Quick start

```html
<script>
	window.WeLoveCookiesConfig = { mode: 'auto', rev: 1, links: { privacyPolicy: '/privacy' } };
</script>
<script src="/consent/welovecookies.min.js"></script>
```

Put it before your analytics and ad tags. Full options: [src/lib/consent/README.md](src/lib/consent/README.md).

## Commands

```sh
npm install
npm test        # unit tests for the banner, rules table and wiretap rule
npm run check   # TypeScript
npm run build   # rebuild static/consent/
```
