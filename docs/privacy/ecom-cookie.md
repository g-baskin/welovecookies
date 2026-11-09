# Ecom Cookie: how cookie consent works

Ecom Cookie is the store's cookie banner, preferences panel and proof-of-consent log. It is built to be reused: the browser part in `src/lib/consent/` has no SvelteKit imports and also ships as one script file (`static/consent/ecom-cookie.min.js`) for other sites.

> Engineering defaults, not legal advice. The region table reflects research done in November 2026 ([law matrix](consent-law-matrix.md)); review it at least yearly.

## What a shopper sees

- **Ask-first regions** (EU/EEA, UK, Switzerland, Quebec, Brazil, China, Korea, Turkey, Saudi Arabia, Thailand, Vietnam, Nigeria; lighter-rule countries such as India, Mexico, Singapore too; and any country not in the table or unknown): a banner with **Accept all**, **Reject all** (same size and style) and **Choose**. Nothing optional runs until they answer. Choices last 180 days.
- **Opt-out regions** (US states with privacy laws, Canada outside Quebec): a short notice with **OK**, **Choose** and a "Do Not Sell or Share" link. Analytics and ads run by default. Browsers sending Global Privacy Control are opted out of marketing automatically and the choice is logged.
- **Notice-only regions** (other US states, Japan, Australia, New Zealand): no banner by default; the footer's **Your privacy choices** page and the small cookie button still work. The cookie button fades away 5 seconds after it appears, or as soon as the shopper scrolls or uses search (`src/lib/consent/auto-hide.ts`); every theme footer links to **Your privacy choices** so the choice can still be changed.
- Layouts: bottom sheet on phones (sits above the product page's sticky add-to-cart bar), a centered card on tablets in portrait, a bottom-left card on tablets in landscape and on desktop. The settings panel is a full-screen sheet on phones and a side drawer on larger screens. The banner follows the active store theme's colors, font and button shape.
- 20 built-in languages picked from the browser (Arabic right-to-left). Owners can override any wording per language.

## Categories and what they control

| Category | Controls |
| --- | --- |
| Necessary (always on) | Cart, sign-in, checkout, security, the consent cookie itself |
| Analytics | PostHog full tracking. Before a choice in ask-first regions PostHog runs cookieless (`cookieless_mode: 'on_reject'`, `opt_out_capturing_by_default`); it opts in when analytics is allowed. **The PostHog project must have "Cookieless server hash mode" on**, or cookieless events are dropped. |
| Marketing | Ad attribution (`eb_attr`), conversion sharing with Meta, TikTok, Google, Microsoft; Google Consent Mode v2 / UET signals; `data-consent="marketing"` scripts |
| Preferences | Off by default (the store sets no preference cookies) |

## Data

- Cookie `eb_cc` (readable by the page): consent id, time, region mode, banner revision, choices, action. Old `eb_consent` is read once and replaced.
- `consent_records`: one row per choice (no IP address): consent id, time, action, choices, mode, country, region, banner revision, language, device, GPC, page path, user agent (clipped), customer id if signed in. Kept 5 years, then purged.
- `consent_daily`: aggregate counts (banner seen, accept all, reject all, custom...) by day, mode, country and device. Banner views are counted without cookies.
- `consent_versions`: the exact wording and cookie list for each banner revision, so any record can show what the visitor saw.

## Owner screens: Admin > Store setup > Privacy & cookies

Overview (accept rates by region type, device and country), Banner (wording, look, position, "ask everyone again"), Cookies (the list shoppers see), Records (look up a consent id, export CSV). Preview any region's banner while signed in: add `?consent_preview=opt-in` (or `opt-out-gpc`, `notice`...) and optionally `&consent_lang=de` to any store URL; previews never record anything.

## Reusing it on another site

See `src/lib/consent/README.md`: one script tag with `window.EcomCookieConfig = { mode: 'auto', ... }`, or `createConsent()` / the Svelte wrapper. Without a server, `mode: 'auto'` guesses the region from the browser time zone and falls back to ask-first. Point `endpoints.record` at your own endpoint to keep proof of consent.

## Added November 2026 (after studying OSPRY's banner, see the goal notes)

- **Cookies are removed when a category is switched off.** Known analytics and ad cookies (Google, PostHog, Clarity, Meta, TikTok, Microsoft, Pinterest, Snap, Reddit, LinkedIn) are deleted from the browser as soon as their category is off, and checked again on each page load (`src/lib/consent/autoclear.ts`). Technical names live only in code, never on screen.
- **One choice for the whole domain.** The choice cookie is written on the site's root domain (found with a short test cookie), so shop.example.com and example.com share it. The browser owns the choice cookie; the server only sets it for the no-JavaScript privacy page form.
- **Store logo on the banner** (Banner tab: "Show my store logo on the banner", on by default when the store has a logo).
- **Switches show ✓ / ✕**, so on/off is not shown by colour alone.
- **Other websites** (Privacy & cookies > Other websites): add a website, paste one script tag into it, and its visitors get the same banner and country rules; their choices and counts are logged here under that website. Only the website's exact address may load its settings or send records.
- **Privacy requests** ("Your privacy choices" page > Ask about your data): delete my data, send me a copy, correct my details, don't sell or share. Requests land in Privacy & cookies > Requests with a due date (15 days Brazil, 45 days US, 30 days elsewhere), status, private note, and a printable "What we hold about them" page. Nothing is deleted automatically.

Engineering detail for these last two (tables, request lifecycle, exact-origin checks): [privacy-requests-and-consent-sites.md](privacy-requests-and-consent-sites.md).
