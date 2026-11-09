<p align="center">
  <img src="docs/assets/hero-title.jpg" alt="We Love Cookies: cookies of every kind bursting out toward the viewer" width="100%">
</p>

<p align="center"><strong>Cookie consent that follows the law where each visitor actually is.</strong></p>

## About

We Love Cookies is a cookie consent banner for any website. Add one file and it shows every visitor the banner their own location calls for: ask-first in the EU, UK, Brazil and other opt-in countries, a short notice with "Do Not Sell or Share" in US privacy-law states, and nothing in the way where no consent is needed. Analytics and ad tags wait until they are allowed, Global Privacy Control is honoured, and tracking cookies are cleared the moment someone says no.

It is one small JavaScript file (about 23 KB gzipped). If your site can put a script in the page `<head>`, it can use We Love Cookies: plain HTML, React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Angular, Astro, static site generators, server-rendered apps (Laravel, Rails, Django, PHP) and site builders. No account, no monthly fee, no outside requests.

- **Rules for 57 countries, Quebec and every US state** (any other country gets the strict ask-first banner), backed by a dated law matrix with sources
- **US wiretap protection**: tags that identify visitors or record sessions can be held until an explicit Accept in all-party-consent states
- **Works with the tools you already use**: Google Consent Mode v2, Google Tag Manager, Microsoft UET, Meta, TikTok and PostHog
- **Auto-clear**: known analytics and ad cookies are deleted as soon as a category is switched off
- **20 languages** (including right-to-left Arabic), phone, tablet and desktop layouts, and colours that match your site
- **Proof of consent**: send every choice to your own endpoint to keep a record

> Engineering defaults, not legal advice. Have your privacy policy and banner wording reviewed for your business, and re-check the rules at least yearly.

## Get started

**1. Get the file.** Download [`dist/welovecookies.min.js`](dist/welovecookies.min.js) and put it where your site serves files as-is (the web root, or the `public/` or `static/` folder). Or skip this step and load it from the [CDN](docs/INSTALL.md#no-upload-cdn).

**2. Add it to every page.** Paste this into the `<head>`, **above** your analytics and ad code, and set your privacy policy address:

```html
<script>
	window.WeLoveCookiesConfig = { mode: 'auto', rev: 1, links: { privacyPolicy: '/privacy' } };
</script>
<script src="/welovecookies.min.js"></script>
```

**3. Let visitors change their mind.** Add this link to your footer:

```html
<a href="#" onclick="WeLoveCookies.openPreferences(); return false;">Cookie settings</a>
```

That's it. The banner picks the rules for each visitor's region, the language from their browser and the colours from your page. To see the strict EU-style banner from anywhere, set `mode: 'opt-in'` for a moment and reload.

## Where it goes on your site

| Your site | Put the file in | Put the snippet in |
| --- | --- | --- |
| Plain HTML, any web server | The web root | The `<head>` of every page (or your shared header) |
| React, Vue, Svelte, Solid, Preact (Vite) | `public/` | `index.html` |
| Angular | `public/` | `src/index.html` |
| Next.js | `public/` | `app/layout.tsx` with `next/script` ([example](docs/INSTALL.md#nextjs)) |
| Nuxt | `public/` | `nuxt.config.ts` → `app.head.script` ([example](docs/INSTALL.md#nuxt)) |
| SvelteKit | `static/` | `src/app.html`, before `%sveltekit.head%` |
| Astro | `public/` | Your base layout, with `is:inline` ([example](docs/INSTALL.md#astro)) |
| Remix, React Router, Gatsby | `public/` (Gatsby: `static/`) | The root layout's `<head>` ([examples](docs/INSTALL.md#remix-and-react-router)) |
| Hugo, Jekyll, Eleventy | `static/` (Hugo) or the site root | The base layout's `<head>` |
| Laravel, Rails, Django, Flask, PHP | `public/` (Django, Flask: `static/`) | The base layout template's `<head>` |
| Shopify, Wix, Squarespace, Webflow, Google Tag Manager | Use the CDN | [Step-by-step guide](docs/INSTALL.md#shopify) |
| WordPress | Optional plugin: [`dist/welovecookies-wordpress.zip`](dist/welovecookies-wordpress.zip) | Installed automatically ([guide](docs/INSTALL.md#wordpress)) |

Single-page apps need nothing extra: the banner keeps working across client-side page changes. The full [install guide](docs/INSTALL.md) has code for each framework, all settings, and how to block your own scripts until consent.

## What's included

| Path | What it is |
| --- | --- |
| `dist/` | Ready to use: `welovecookies.min.js` (script tag, works on any site), `welovecookies.mjs` (JavaScript module), `welovecookies-wordpress.zip` (optional WordPress plugin) |
| `docs/INSTALL.md` | Install steps for every framework and site builder, settings, and how to check it works |
| `docs/privacy/` | How it works, the law matrix with sources, and banner research |
| `demo/` | A demo page to try every region and language |
| `src/lib/consent/` | Source: banner, consent manager, region rules (`regions.ts`), US wiretap rule (`wiretap.ts`) |
| `wordpress/` | Source of the optional WordPress plugin |

## For developers

```sh
npm install
npm test        # unit tests
npm run check   # TypeScript
npm run build   # rebuild dist/ (script, module and WordPress zip)
npm run demo    # demo at http://localhost:4173/demo/
```
