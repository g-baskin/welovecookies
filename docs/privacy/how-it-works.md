# How We Love Cookies works

We Love Cookies is a cookie banner, preferences panel and consent manager for any website. It is one script file (`dist/welovecookies.min.js`) with no framework and no outside requests, so it can be uploaded to any host or loaded from a CDN.

> Engineering defaults, not legal advice. The region table reflects research done in November 2026 ([law matrix](consent-law-matrix.md)); review it at least yearly.

## What a visitor sees

- **Ask-first regions** (EU/EEA, UK, Switzerland, Quebec, Brazil, China, Korea, Turkey, Saudi Arabia, Thailand, Vietnam, Nigeria; lighter-rule countries such as India, Mexico, Singapore too; and any country not in the table or unknown): a banner with **Accept all**, **Reject all** (same size and style) and **Choose**. Nothing optional runs until they answer. Choices last 180 days.
- **Opt-out regions** (US states with privacy laws, Canada outside Quebec): a short notice with **OK**, **Choose** and a "Do Not Sell or Share" link. Analytics and ads run by default. Browsers sending Global Privacy Control are opted out of marketing automatically.
- **Notice-only regions** (other US states, Japan, Australia, New Zealand): no banner by default; the small cookie button and your "Cookie settings" link still open the choices. The cookie button fades away 5 seconds after it appears, or as soon as the visitor scrolls (`src/lib/consent/auto-hide.ts`).
- Layouts: bottom sheet on phones (it can sit above a sticky bottom bar with `avoidSelector`), a centered card on tablets in portrait, a bottom-left card on tablets in landscape and on desktop. The settings panel is a full-screen sheet on phones and a side drawer on larger screens. The banner picks up the page's colors, font and button shape from CSS variables, or from `theme`.
- 20 built-in languages picked from the browser (Arabic right-to-left). Any wording can be overridden per language.

## Where the visitor is

Without a server, `mode: 'auto'` guesses the region from the browser's time zone and falls back to ask-first when unsure. With a server or CDN that knows the visitor's country (for example Cloudflare's `CF-IPCountry` header), pass the exact mode instead: `modeFor(country, region)` in `src/lib/consent/regions.ts` returns it.

## Categories and what they control

| Category | Controls |
| --- | --- |
| Necessary (always on) | Sign-in, security, the consent cookie itself |
| Analytics | Analytics tools such as PostHog and Google Analytics. With PostHog, initialise it with `cookieless_mode: 'on_reject'` and `opt_out_capturing_by_default: true`; it opts in when analytics is allowed |
| Marketing | Ad and conversion tags (Meta, TikTok, Google, Microsoft); Google Consent Mode v2 and UET signals; `data-consent="marketing"` scripts |
| Preferences | Off by default; for sites that store display preferences |

## Data

- Cookie `wlc_consent` (readable by the page): consent id, time, region mode, banner revision, choices, action. It is written on the root domain, so www.example.com and blog.example.com share one choice.
- Nothing is sent anywhere unless you set `endpoints.record`. Then every choice is POSTed as JSON (consent id, action, choices, mode, banner revision, language, device, GPC, page path) so you can keep proof of consent. Keep those records for the life of the consent plus a buffer; the [law matrix](consent-law-matrix.md#3-proof-of-consent-log) suggests 5 years for opt-in regions.

## More features

- **Cookies are removed when a category is switched off.** Known analytics and ad cookies (Google, PostHog, Clarity, Hotjar, Matomo, Mixpanel, Segment, Meta, TikTok, Microsoft, Pinterest, Snap, Reddit, LinkedIn) are deleted as soon as their category is off, and checked again on each page load (`src/lib/consent/autoclear.ts`). Technical names live only in code, never on screen.
- **Your logo on the banner** with `logoUrl` and `brandName`.
- **Switches show ✓ / ✕**, so on/off is not shown by colour alone.
- **US wiretap rule.** In all-party-consent states, tags that identify visitors or record sessions should load only after an explicit Accept: `mayLoadIdentifyingTag()` in `src/lib/consent/wiretap.ts`.
