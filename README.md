<p align="center">
  <img src="docs/assets/hero-title.jpg" alt="We Love Cookies: cookies of every kind bursting out toward the viewer" width="100%">
</p>

<p align="center"><strong>Cookie consent that follows the law where each visitor actually is.</strong></p>

## About

We Love Cookies is a cookie consent banner for any website. Add one file and it shows every visitor the banner their own location calls for: ask-first in the EU, UK, Brazil and other opt-in countries, a short notice with "Do Not Sell or Share" in US privacy-law states, and nothing in the way where no consent is needed. Analytics and ad tags wait until they are allowed, Global Privacy Control is honoured, and tracking cookies are cleared the moment someone says no.

It works on plain HTML sites, WordPress, Shopify, Wix, Squarespace, Webflow and Google Tag Manager, with no account, no monthly fee and no outside requests.

- **Rules for 57 countries, Quebec and every US state** (any other country gets the strict ask-first banner), backed by a dated law matrix with sources
- **US wiretap protection**: tags that identify visitors or record sessions can be held until an explicit Accept in all-party-consent states
- **Works with the tools you already use**: Google Consent Mode v2, Google Tag Manager, Microsoft UET, Meta, TikTok and PostHog
- **Auto-clear**: known analytics and ad cookies are deleted as soon as a category is switched off
- **20 languages** (including right-to-left Arabic), phone, tablet and desktop layouts, and colours that match your site
- **Proof of consent**: send every choice to your own endpoint to keep a record

> Engineering defaults, not legal advice. Have your privacy policy and banner wording reviewed for your business, and re-check the rules at least yearly.

## Install in 2 minutes

**Any website:** upload [`dist/welovecookies.min.js`](dist/welovecookies.min.js) to your site and paste this into the `<head>`, above your analytics and ad code:

```html
<script>
	window.WeLoveCookiesConfig = { mode: 'auto', rev: 1, links: { privacyPolicy: '/privacy' } };
</script>
<script src="/welovecookies.min.js"></script>
```

**WordPress:** upload [`dist/welovecookies-wordpress.zip`](dist/welovecookies-wordpress.zip) under **Plugins > Add New > Upload Plugin** and activate it.

**Shopify, Wix, Squarespace, Webflow, Google Tag Manager, or no upload at all:** see the [install guide](docs/INSTALL.md).

## What's included

| Path | What it is |
| --- | --- |
| `dist/` | Ready to use: `welovecookies.min.js` (script tag), `welovecookies.mjs` (JavaScript module), `welovecookies-wordpress.zip` (WordPress plugin) |
| `docs/INSTALL.md` | Step-by-step install for every platform, settings, and how to check it works |
| `docs/privacy/` | How it works, the law matrix with sources, and banner research |
| `demo/` | A demo page to try every region and language |
| `src/lib/consent/` | Source: banner, consent manager, region rules (`regions.ts`), US wiretap rule (`wiretap.ts`) |
| `wordpress/` | WordPress plugin source |

## For developers

```sh
npm install
npm test        # unit tests
npm run check   # TypeScript
npm run build   # rebuild dist/ and the WordPress zip
npm run demo    # demo at http://localhost:4173/demo/
```
