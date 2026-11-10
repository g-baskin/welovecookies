# Install We Love Cookies

We Love Cookies is one script file that works on any website. Pick the way that matches yours. Every option ends the same way: the banner script loads in the page `<head>`, **before** your analytics and ad tags, so nothing tracks a visitor before the banner has had its say.

> Engineering defaults, not legal advice. Have your privacy policy and banner wording reviewed for your business.

- [Any website: upload one file](#any-website-upload-one-file)
- [No upload (CDN)](#no-upload-cdn)
- [Frameworks](#frameworks): React, Vue, Svelte, Angular, Next.js, Nuxt, SvelteKit, Astro, Remix, Gatsby, Hugo, Jekyll, Eleventy, Laravel, Rails, Django, Flask, PHP
- [Site builders](#shopify): Shopify, Wix, Squarespace, Webflow
- [Google Tag Manager](#google-tag-manager)
- [WordPress](#wordpress)
- [Add a "Cookie settings" link](#add-a-cookie-settings-link)
- [Block your own scripts until consent](#block-your-own-scripts-until-consent)
- [Settings](#settings)
- [Check that it works](#check-that-it-works)
- [Optional admin](#optional-admin)

## Any website: upload one file

1. Download [`dist/welovecookies.min.js`](../dist/welovecookies.min.js) (about 25 KB gzipped).
2. Upload it to the top folder of your website, so it opens at `https://your-site.com/welovecookies.min.js`.
3. Paste this into the `<head>` of every page, above any analytics or ad code, and change the privacy policy address:

```html
<script>
	window.WeLoveCookiesConfig = { mode: 'auto', rev: 1, links: { privacyPolicy: '/privacy' } };
</script>
<script src="/welovecookies.min.js"></script>
```

That's it. The banner picks the rules for the visitor's region, the language from their browser and the colours from your page.

If your site has a strict Content-Security-Policy that blocks inline scripts, skip the first `<script>` and put the settings on the tag instead: `<script src="/welovecookies.min.js" data-privacy="/privacy"></script>` (see [Settings](#settings)).

## No upload (CDN)

Same snippet, but load the file from jsDelivr instead of your own server:

```html
<script>
	window.WeLoveCookiesConfig = { mode: 'auto', rev: 1, links: { privacyPolicy: '/privacy' } };
</script>
<script src="https://cdn.jsdelivr.net/gh/g-baskin/welovecookies@main/dist/welovecookies.min.js"></script>
```

For a live site, replace `@main` with a release tag (for example `@v1.3.0`; all releases are listed on [GitHub](https://github.com/g-baskin/welovecookies/releases)), so an update never changes your site without you choosing it.

## Frameworks

In every framework the idea is the same: copy `welovecookies.min.js` into the folder the framework serves as-is, and load it in the document `<head>` before anything that tracks. The script works on its own, so there is nothing to `npm install`. Single-page apps need nothing extra; the banner stays active across client-side page changes.

### React, Vue, Svelte, Solid, Preact (Vite) and Angular

Copy the file to `public/`, and paste the [snippet](#any-website-upload-one-file) into the `<head>` of `index.html` (Angular: `src/index.html`).

### Next.js

Copy the file to `public/`. In the root layout, load it with `beforeInteractive` (Next.js runs these first, in the order written):

```tsx
// app/layout.tsx
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				{children}
				<Script id="welovecookies-config" strategy="beforeInteractive">
					{`window.WeLoveCookiesConfig = { mode: 'auto', rev: 1, links: { privacyPolicy: '/privacy' } };`}
				</Script>
				<Script src="/welovecookies.min.js" strategy="beforeInteractive" />
			</body>
		</html>
	);
}
```

Pages Router: put the same two `<Script>` tags in `pages/_document.tsx`.

### Nuxt

Copy the file to `public/`, then:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
	app: {
		head: {
			script: [
				{ innerHTML: "window.WeLoveCookiesConfig = { mode: 'auto', rev: 1, links: { privacyPolicy: '/privacy' } };" },
				{ src: '/welovecookies.min.js' }
			]
		}
	}
});
```

### SvelteKit

Copy the file to `static/`, and paste the [snippet](#any-website-upload-one-file) into `src/app.html`, just before `%sveltekit.head%`.

### Astro

Copy the file to `public/`. In your base layout's `<head>`, use `is:inline` so Astro leaves the scripts as they are:

```astro
<script is:inline>
	window.WeLoveCookiesConfig = { mode: 'auto', rev: 1, links: { privacyPolicy: '/privacy' } };
</script>
<script is:inline src="/welovecookies.min.js"></script>
```

### Remix and React Router

Copy the file to `public/`. In `app/root.tsx`:

```tsx
<head>
	<script dangerouslySetInnerHTML={{ __html: "window.WeLoveCookiesConfig = { mode: 'auto', rev: 1, links: { privacyPolicy: '/privacy' } };" }} />
	<script src="/welovecookies.min.js" />
	<Meta />
	<Links />
</head>
```

### Gatsby

Copy the file to `static/`. In `gatsby-ssr.js`:

```jsx
import React from 'react';

export const onRenderBody = ({ setHeadComponents }) => {
	setHeadComponents([
		<script key="wlc-config" dangerouslySetInnerHTML={{ __html: "window.WeLoveCookiesConfig = { mode: 'auto', rev: 1, links: { privacyPolicy: '/privacy' } };" }} />,
		<script key="wlc" src="/welovecookies.min.js" />
	]);
};
```

### Hugo, Jekyll, Eleventy

Put the file in Hugo's `static/` folder, the root of a Jekyll site, or an Eleventy passthrough copy (`eleventyConfig.addPassthroughCopy('welovecookies.min.js')`). Paste the [snippet](#any-website-upload-one-file) into the `<head>` of your base layout (for example `layouts/_default/baseof.html` or `_layouts/default.html`).

### Laravel, Rails, Django, Flask, PHP

Put the file in the folder your app serves as-is and paste the [snippet](#any-website-upload-one-file) into the base layout's `<head>`, pointing `src` at the file:

| Framework | File in | `src` |
| --- | --- | --- |
| Laravel (Blade) | `public/` | `{{ asset('welovecookies.min.js') }}` |
| Rails (ERB) | `public/` | `/welovecookies.min.js` |
| Django | an app's `static/` folder | `{% static 'welovecookies.min.js' %}` (with `{% load static %}` at the top) |
| Flask | `static/` | `{{ url_for('static', filename='welovecookies.min.js') }}` |
| Plain PHP | the web root | `/welovecookies.min.js` |

### Use it as a JavaScript module

If you prefer to bundle it, copy `dist/welovecookies.mjs` into your source and start it in the browser yourself:

```js
import { createConsent } from './welovecookies.mjs';

const consent = createConsent({ mode: 'auto', rev: 1, links: { privacyPolicy: '/privacy' } });
// consent.openPreferences(), consent.get(), consent.onChange(cb)
```

This does not create `window.WeLoveCookies`, so call `consent.openPreferences()` from your "Cookie settings" link. Bundled code runs after the page's head scripts, so only use this when your analytics also start from your code; otherwise prefer the script tag.

## Shopify

1. **Online Store > Themes**, then on your live theme choose **… > Edit code**.
2. Open `layout/theme.liquid` and paste the [CDN snippet](#no-upload-cdn) just after `<head>`, **above** `{{ content_for_header }}`. To host the file yourself instead, upload `welovecookies.min.js` under **Assets** and use `<script src="{{ 'welovecookies.min.js' | asset_url }}"></script>`.
3. Save, then turn off Shopify's own cookie banner (**Settings > Customer privacy**) so visitors don't see two.

Note: Shopify's built-in tracking (Shopify analytics and its app pixels) follows Shopify's own Customer Privacy API, not this banner. The [integration notes](privacy/consent-ux-research.md#shopify-if-the-site-runs-on-shopify-or-hydrogen) show how to pass the choice on.

## Wix, Squarespace, Webflow

These builders need a paid plan to add code to the head. Use the [CDN snippet](#no-upload-cdn), and turn off the builder's own cookie banner so visitors don't see two.

| Builder | Where to paste it |
| --- | --- |
| Wix | **Settings > Custom code > + Add Custom Code**. Paste, choose **All pages** and **Head**, then **Apply** |
| Squarespace | **Settings > Advanced > Code Injection > Header** |
| Webflow | **Site settings > Custom code > Head code**, then publish the site |

## Google Tag Manager

1. **Tags > New > Custom HTML**, and paste the [CDN snippet](#no-upload-cdn).
2. Trigger: **Consent Initialization - All Pages**, so it runs before every other tag.
3. Save and publish.

The banner sends Google Consent Mode v2 signals, so Google tags in the container wait for the visitor's choice automatically.

## WordPress

WordPress sites can use the [snippet](#any-website-upload-one-file) like any other site (in the theme's `header.php`, or a header-code plugin). For a no-code install there is an optional plugin:

1. Download [`dist/welovecookies-wordpress.zip`](../dist/welovecookies-wordpress.zip).
2. In WordPress: **Plugins > Add New > Upload Plugin**, choose the zip, **Install Now**, then **Activate**.
3. Set your privacy policy page under **Settings > Privacy**. The banner links to it automatically.
4. Optional: put the shortcode `[welovecookies_settings]` in your footer (a widget or the block editor's Shortcode block) to show a "Cookie settings" button.

The plugin loads the banner at the top of every page's `<head>`. If you already use another cookie banner plugin, deactivate it so visitors don't see two.

Developers can change any [setting](#settings) from a theme or plugin:

```php
add_filter( 'welovecookies_config', function ( $config ) {
	$config['logoUrl']   = '/wp-content/uploads/logo.png';
	$config['brandName'] = 'My Site';
	return $config;
} );
```

## Add a "Cookie settings" link

Visitors must be able to change their mind. Put this in your footer:

```html
<a href="#" onclick="WeLoveCookies.openPreferences(); return false;">Cookie settings</a>
```

## Block your own scripts until consent

Google tags (through Consent Mode), Microsoft UET, the Meta pixel, TikTok and PostHog are handled automatically. For any other script, change its `type` and add the category it needs:

```html
<!-- Runs only after the visitor allows analytics -->
<script type="text/plain" data-consent="analytics" data-src="https://example.com/analytics.js"></script>

<!-- Inline code runs only after the visitor allows marketing -->
<script type="text/plain" data-consent="marketing">
	/* your ad code */
</script>
```

### Known trackers are held for you

Some trackers are often added by a tag manager or a plugin rather than written in your page. The banner holds these back until their category is allowed, even when another script adds them later:

- **Analytics:** Hotjar, Microsoft Clarity, Mixpanel, Segment, Matomo Cloud
- **Marketing:** LinkedIn Insight, Pinterest, Snap, Reddit, X (Twitter)

A tracker added by code makes no request before consent. This only works for scripts added after the banner script runs, so keep it first in `<head>`. For your own tags, still use `type="text/plain"` as above: the browser may download a tracker written straight into the HTML (it won't run it), but never a `text/plain` one.

Hold other script hosts too with `blockScripts`, as `host` or `host/path` (subdomains included):

```js
window.WeLoveCookiesConfig = {
	blockScripts: { analytics: ['stats.example.com'], marketing: ['ads.example.net/pixel/'] }
};
```

This is on by default. To turn it off, set `integrations: { knownTrackers: false }` (in the admin: **Hold back known trackers added by other scripts**).

## Settings

Put any of these in `window.WeLoveCookiesConfig`. Full list: [`src/lib/consent/README.md`](../src/lib/consent/README.md).

| Setting | What it does | Example |
| --- | --- | --- |
| `mode` | `'auto'` picks the rules from the visitor's region. Or force one: `'opt-in'`, `'opt-out-gpc'`, `'opt-out'`, `'notice'` | `'auto'` |
| `rev` | Raise it to ask everyone again (after adding a new tool) | `2` |
| `links` | Your privacy policy, cookie policy and privacy choices pages | `{ privacyPolicy: '/privacy', cookiePolicy: '/cookies' }` |
| `lang` | Force a language instead of the browser's | `'de'` |
| `position` | Where the banner sits on larger screens | `'auto'` |
| `logoUrl`, `brandName` | Your logo on the banner and its alt text | `'/logo.png'`, `'My Site'` |
| `theme` | Colours, if your page has no `--color-*` CSS variables | `{ primary: '#14532d' }` |
| `cookies` | The cookie list visitors see in the settings panel | see `ConsentConfig` |
| `texts` | Your own wording, per language | `{ en: { title: 'Cookies?' } }` |
| `endpoints.record` | An address that receives each choice as JSON, to keep proof of consent ([RECORDS.md](RECORDS.md)) | `'/api/consent'` |
| `blockScripts` | More script hosts to hold until a category is allowed ([how](#known-trackers-are-held-for-you)) | `{ analytics: ['stats.example.com'] }` |
| `integrations` | Turn a built-in integration off, for example holding known trackers | `{ knownTrackers: false }` |

The same settings can go on the script tag as `data-` attributes, for example `<script src="/welovecookies.min.js" data-privacy="/privacy" data-rev="2"></script>`.

## Check that it works

1. Open your site in a private window. Where the rules need it, the banner appears.
2. To see the strict EU-style banner from anywhere, set `mode: 'opt-in'` for a moment, reload, then set it back to `'auto'`.
3. Click **Reject all**, open your browser's developer tools, and check that no analytics or ad requests are sent.
4. Try the demo page: `npm run demo`, then open `http://localhost:4173/demo/?mode=opt-in&lang=fr`.

## Optional admin

To keep proof-of-consent records, see answer rates, edit the banner and cookie list without touching code, and receive privacy requests, run the optional admin on your own Cloudflare account ([ADMIN.md](ADMIN.md)) or your own server with Node or Docker ([ADMIN-SELF-HOSTED.md](ADMIN-SELF-HOSTED.md)), and use the script tag it gives you instead of the one above.

To keep only the records, on a server you already run, set `endpoints.record` and see [RECORDS.md](RECORDS.md) for what your endpoint receives, with short Node, PHP and Python examples.
