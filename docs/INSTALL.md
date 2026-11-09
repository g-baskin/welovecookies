# Install We Love Cookies

Pick the way that matches your website. Every option ends the same way: the banner script loads in the page `<head>`, **before** your analytics and ad tags, so nothing tracks a visitor before the banner has had its say.

> Engineering defaults, not legal advice. Have your privacy policy and banner wording reviewed for your business.

- [Any website: upload one file](#any-website-upload-one-file)
- [Any website: no upload (CDN)](#any-website-no-upload-cdn)
- [WordPress](#wordpress)
- [Shopify](#shopify)
- [Wix, Squarespace, Webflow](#wix-squarespace-webflow)
- [Google Tag Manager](#google-tag-manager)
- [Add a "Cookie settings" link](#add-a-cookie-settings-link)
- [Block your own scripts until consent](#block-your-own-scripts-until-consent)
- [Settings](#settings)
- [Check that it works](#check-that-it-works)

## Any website: upload one file

1. Download [`dist/welovecookies.min.js`](../dist/welovecookies.min.js) (about 23 KB gzipped).
2. Upload it to the top folder of your website, so it opens at `https://your-site.com/welovecookies.min.js`.
3. Paste this into the `<head>` of every page, above any analytics or ad code, and change the privacy policy address:

```html
<script>
	window.WeLoveCookiesConfig = { mode: 'auto', rev: 1, links: { privacyPolicy: '/privacy' } };
</script>
<script src="/welovecookies.min.js"></script>
```

That's it. The banner picks the rules for the visitor's region, the language from their browser and the colours from your page.

## Any website: no upload (CDN)

Same snippet, but load the file from jsDelivr instead of your own server:

```html
<script>
	window.WeLoveCookiesConfig = { mode: 'auto', rev: 1, links: { privacyPolicy: '/privacy' } };
</script>
<script src="https://cdn.jsdelivr.net/gh/g-baskin/welovecookies@main/dist/welovecookies.min.js"></script>
```

For a live site, replace `@main` with a release tag (for example `@v1.0.0`) once releases are published, so an update never changes your site without you choosing it.

## WordPress

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

## Shopify

1. **Online Store > Themes**, then on your live theme choose **… > Edit code**.
2. Open `layout/theme.liquid` and paste the [CDN snippet](#any-website-no-upload-cdn) just after `<head>`, **above** `{{ content_for_header }}`. To host the file yourself instead, upload `welovecookies.min.js` under **Assets** and use `<script src="{{ 'welovecookies.min.js' | asset_url }}"></script>`.
3. Save, then turn off Shopify's own cookie banner (**Settings > Customer privacy**) so visitors don't see two.

Note: Shopify's built-in tracking (Shopify analytics and its app pixels) follows Shopify's own Customer Privacy API, not this banner. The [integration notes](privacy/consent-ux-research.md#shopify-if-the-site-runs-on-shopify-or-hydrogen) show how to pass the choice on.

## Wix, Squarespace, Webflow

These builders need a paid plan to add code to the head. Use the [CDN snippet](#any-website-no-upload-cdn), and turn off the builder's own cookie banner so visitors don't see two.

| Builder | Where to paste it |
| --- | --- |
| Wix | **Settings > Custom code > + Add Custom Code**. Paste, choose **All pages** and **Head**, then **Apply** |
| Squarespace | **Settings > Advanced > Code Injection > Header** |
| Webflow | **Site settings > Custom code > Head code**, then publish the site |

## Google Tag Manager

1. **Tags > New > Custom HTML**, and paste the [CDN snippet](#any-website-no-upload-cdn).
2. Trigger: **Consent Initialization - All Pages**, so it runs before every other tag.
3. Save and publish.

The banner sends Google Consent Mode v2 signals, so Google tags in the container wait for the visitor's choice automatically.

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
| `endpoints.record` | An address that receives each choice as JSON, to keep proof of consent | `'/api/consent'` |

The same settings can go on the script tag as `data-` attributes, for example `<script src="/welovecookies.min.js" data-privacy="/privacy" data-rev="2"></script>`.

## Check that it works

1. Open your site in a private window. Where the rules need it, the banner appears.
2. To see the strict EU-style banner from anywhere, set `mode: 'opt-in'` for a moment, reload, then set it back to `'auto'`.
3. Click **Reject all**, open your browser's developer tools, and check that no analytics or ad requests are sent.
4. Try the demo page: `npm run demo`, then open `http://localhost:4173/demo/?mode=opt-in&lang=fr`.
