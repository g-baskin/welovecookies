# Cookie consent bar: UX research, CMP comparison, integration notes
Researched 3 Nov 2026. Every claim links to a source in the Sources section, keyed as [S#].

## 1. Design recommendations

### What actually raises acceptance, honestly
- **Equal buttons are now the norm, so win on trust instead.** A study of German sites found that the share with equally visible Accept and Reject buttons rose from 27% (2023) to 52% (2025). Average consent there is about 40% with an equal reject button and up to 54% without one [S20]. Plan for roughly 40-60% in the EU.
- **Nordic sites with compliant banners reach 72.5-82% on average, and some exceed 90%** [S21]. The gap between sites is about trust and context, not tricks. In that study a betting company got 91.8% and a healthcare company 56.5% [S21].
- **Axeptio's friendly, branded, illustrated approach.** Case studies report consent rates of 72-84% [S9, S10]. TUI France rebuilt its banner as a branded "welcome moment" with a hospitality tone and recorded a 71% interaction rate, 78% consent rate and 55% opt-in rate over 12 months [S11]. Speedway went from 65% to 79% interaction in six months, ending balanced between mobile and desktop [S12]. Axeptio itself says copy length, tone of voice, how intrusive the format feels, and video versus image all affect interaction, consent and opt-in rates [S13]. Treat these as vendor data, not independent studies.
- **Mobile versus desktop.** On a German e-commerce site (Utz et al.), a highlighted Accept was taken by 50.8% of mobile visitors but only 26.9% on desktop, because desktop users mostly ignored a small banner [S22]. 65.9% of desktop visitors did nothing at all [S23]. **Implication:** on desktop the banner must be noticeable (a card in the reading area, not a thin footer strip) without blocking the page.
- **Measure the right things.** Axeptio defines opt-in rate as consent rate × interaction rate [S14]. Track all three per device in PostHog (cookieless) so A/B tests of copy and tone stay honest.

### Hard rules (EU/UK) that the design must follow
1. **Reject all is a button on the first layer**, next to Accept all, with the same size, colour, contrast and wording style [S1, S2, S3, S5, S6].
2. **No pre-ticked boxes**, including on the second layer [S4].
3. **No reject-as-link** buried in text, **no** "Continue without accepting" placed outside the banner, and no colour or contrast trick [S1, S2].
4. **Reject means reject.** CNIL fined Shein €150M partly because cookies were still set after "Refuse all" [S7]. Test this with DevTools on every release.
5. **Withdrawal is always reachable**: a floating icon or footer link that reopens the panel [S2, S8].
6. **The UK expects equal prominence too.** The ICO's checklist starts with "as easy to refuse as to accept"; its good-practice example shows Accept all, Reject all and a "more options" button on both mobile and desktop [S5].

### Layout per device (one Svelte component, responsive)
| Viewport | Layout | Notes |
|---|---|---|
| Phone ≤ 600px (390px target) | **Bottom sheet**, full width, max height about 45vh, rounded top corners, `padding-bottom: max(16px, env(safe-area-inset-bottom))` | Buttons stacked full width, each at least 48px tall: **[Accept all] [Reject all]** side by side as two equal halves, with **"Choose" / "Settings"** as a third full-width secondary button below. No backdrop and no scroll lock. |
| Tablet portrait (768-834px) | **Floating card**, bottom centre, max-width 560px, 16px from the edges plus the safe area | Three buttons in one row if they fit, otherwise 2+1. |
| Tablet landscape / small desktop (1024-1366px) | **Floating card, bottom-left**, max-width 420-480px | Bottom-left keeps it away from the usual right-side chat and cart widgets drawer, chat widget and sticky "Add to cart". |
| Desktop 1440px | Same bottom-left card, 440px | Do not use a thin full-width strip, because desktop users ignore it [S22]. |

Cookiebot's Swift banner uses the same responsive logic: edge-to-edge above about 1280px, a dialog below that, and a dedicated mobile banner under 600px [S15].

**Do not cover what people came for:**
- On pages with a sticky call-to-action bar, place the sheet **above** that bar (measure the bar and set `bottom` from it) so the main action stays visible. Never set `inert` on the page.
- In checkout and sign-up flows, show the compact version only.
- Set `scroll-padding-bottom` to the banner height so focused fields are never hidden underneath it (WCAG 2.4.11 [S24]).

**CLS/INP:**
- Render it as `position: fixed` in an overlay layer, so it never pushes content.
- Animate only `transform`/`opacity`.
- Server-render it hidden based on the consent cookie (read in a SvelteKit `hooks.server.ts`) so returning visitors never get a flash of the banner.
- Button handlers save the choice and close the banner synchronously. Defer tag loading with `requestIdleCallback`/`setTimeout(0)` so INP stays low.

### Button labels and order
- First layer: **"Accept all"** · **"Reject all"** · **"Choose"** (or "Settings").
- Accept and Reject must look identical: same style, same weight. Use the brand colour for both, or a neutral filled style for both. Keep the order the same on every device.
- Use plain, direct labels. "Maybe later" or "Continue browsing" in place of Reject is risky [S6].
- Do not add a close "X" that silently means reject in the EU. An "X" equal to Reject is acceptable only if Reject all is also present. Research shows users use the X as a fast reject [S25].

### Copy tone (warm, short, specific, no guilt)
- **Example A (default, EN):** *"Cookies, the useful kind 🍪 · We'd like to use analytics to see what you enjoy here, and ad cookies to show you our ads on other sites. Totally your call: the site works the same either way."*
- **Example B (minimal):** *"Help us make this site better? With your OK we measure visits and improve our ads. You can change this anytime from the 🍪 button."*
- **Example C (DE tone, formal):** *"Dürfen wir Statistik- und Marketing-Cookies nutzen? Damit verbessern wir die Website und unsere Werbung. Ihre Wahl gilt, bis Sie sie ändern."*
- Rules: name the purposes in plain words, state that refusing has no penalty, link to the cookie policy, keep the text under 40 words. No guilt-tripping or emotional pressure, which the ICO calls out [S16]. No perks (owner decision).

### Preferences panel
- Desktop/tablet: a side drawer (right, 420px). Phone: a full-height sheet. Use `role="dialog"`, `aria-modal="true"`, trap focus, close with Esc, and return focus to the trigger on close.
- Categories, each with a one-line plain description and a switch (`role="switch"`, all off by default):
  1. **Necessary** (always on, locked, explains sign-in, security and the consent cookie)
  2. **Analytics** (PostHog/GA4)
  3. **Marketing** (Google Ads, Meta, TikTok, Microsoft Ads)
  4. optional **Preferences**
- An expandable "See providers" list under each category (the ICO requires naming third parties [S5]).
- Footer buttons: **Reject all · Save choices · Accept all**, all the same visual weight.

### Re-open control
- A small 44×44 floating 🍪 button, bottom-left, `aria-label="Cookie settings"`. Show it after a choice is made, hide it in checkout and sign-up flows, and keep it out of the sticky CTA's way.
- **Plus** a "Cookie settings" link in the footer. ICO-oriented guidance expects a persistent footer link or icon [S17].
- Remember the choice for 6-12 months, and reprompt when categories or vendors change (store a `revision`).

### Accessibility checklist (WCAG 2.2 AA)
- Targets at least 24×24 (2.5.8, AA) [S24]. Use 44-48px on touch, matching AAA 2.5.5 [S26].
- Visible `:focus-visible` ring, and the banner never fully hides the focused element (2.4.11) [S24].
- Banner is `role="region"` with `aria-labelledby` pointing at its title. It is non-modal, so do not trap focus; put it early in DOM order and add a skip link. The preferences panel is a modal and does trap focus.
- Contrast at least 4.5:1, respects `prefers-reduced-motion`, works at 200% zoom and 320px width.
- `lang` attribute per translation.

### Languages and regions
- Use i18n strings per locale. At minimum EN, DE, FR, ES, IT, NL, PL, SV, DA, plus your site's languages.
- Geo mode:
  - EEA/UK/CH: opt-in, banner shown.
  - US: no blocking banner; honour GPC, and show a "Your privacy choices" link.
  - Other regions: configurable.

## 2. CMP comparison

| Product | Layout (mobile / desktop) | Buttons on first layer | Categories / re-open | Languages | Notable / data |
|---|---|---|---|---|---|
| **Cookiebot (Usercentrics)** | Swift template: edge-to-edge bar above about 1280px, dialog below about 1080px, dedicated mobile banner below 600px; also Pop up, Overlay, Compact left/right slide-up [S15] | Default GDPR set "Reject all / Selection / Allow all"; can be 1, 2 or 3 buttons; no pre-checked boxes by default [S27] | Necessary/Preferences/Statistics/Marketing; renew/withdraw widget | Many (auto) | Built-in UET [S36] and Meta consent hooks [S37] |
| **Usercentrics** (same group) | Banner/first-layer modal, configurable | Accept/Deny/More | Category + service level | Many | Reports an **80% average opt-in** across its *app* CMP base, top performers 90%+ [S18] (apps, not web) |
| **OneTrust** | Flat (full width), Floating Flat (half width), Floating Rounded, Floating Rounded Corner (third width), plus a "Choices" banner with inline categories [S28] | Configurable: Allow all, Reject all, Cookie settings, optional X (X closes without choosing); drag to reorder [S29] | Preference Center; floating re-open icon | Auto-translates out-of-the-box text only [S28] | Enterprise; heavy script |
| **CookieYes** | Banner, box or sidebar [S30] | Accept/Reject/Customize | Category toggles; revisit-consent widget for review/withdrawal [S31] | 30+ [S31] | Free tier; GCM support |
| **Axeptio** | Friendly "conversational" widget (bottom corner) with illustrations, video, mascots; also a full-screen Consent Wall [S9] | Accept/Refuse/Customize | Stepwise per-category screens | Many | Case studies 72-84% [S9, S10]; built-in A/B testing on tone and format [S13] |
| **Didomi** | Popup, top/bottom banner, small banner or floating panel (e.g. `panel-bottom-right`) [S32]; on mobile SDK, popup or bottom [S33] | Agree / Disagree (can be primary-styled) / Learn more; Learn-more order configurable [S32] | Purposes + vendors | Many, EN fallback [S33] | Strong multi-regulation geotargeting [S31] |
| **Osano** | Banner (box or bar) + Drawer (preference centre) + Widget icon to re-open [S34] | Accept/Deny/Manage | Drawer; optional "Do Not Sell" modal | Geo-based language [S35] | Unified DSAR/"Do not sell" handling |
| **Termly** | Top/bottom bar, corner tooltip, or full-screen modal [S38] | Accept/Decline/Preferences | Preference centre | 13 listed languages, auto-detected [S39] | Offers "scroll to consent" (avoid: not valid EU consent) [S38]; TCF 2.3 + GCM [S39] |
| **Shopify built-in** | Shopify-managed banner (Settings > Customer privacy) [S40] | Accept/Decline/Manage | Analytics, marketing, preferences, sale of data | Store locales | Only governs Shopify surfaces (pixels, audiences, checkout) [S41]; honours GPC automatically in opt-out regions [S41] |
| **iubenda** | Not verified in this pass (no primary source fetched). Known for a floating preferences button; confirm in docs before relying on this | n/a | n/a | n/a | n/a |
| **orestbida/cookieconsent v3** (MIT, open source) | consentModal: `box` (wide/inline), `cloud` (inline), `bar` (inline), any of top/middle/bottom × left/center/right; preferencesModal: `box` or `bar` (wide, left/right) [S42] | Accept all / Reject all / Manage; **`equalWeightButtons: true` is the default**, `flipButtons` reorders [S42] | Categories with `readOnly` necessary; `showPreferences()` to re-open | Translations config, any language | Framework-agnostic, small; fits SvelteKit well |
| **Klaro** (BSD-3, open source) | Notice (compact banner) + modal; also contextual per-embed notices [S43] | Accept/Decline/Customize | Per-service or per-purpose consent; `klaro.show()` re-opens [S44] | 20+ languages [S43] | Blocks scripts via `data-src`/`type="text/plain"` [S45] |
| **c15t** (open source, React/Svelte/Astro) | `bar`/`floating`/`wall` variants and positions, button `layout` arrays; policy enforces reject-next-to-accept [S46] | Accept/Reject/Customize | Built-in PostHog sync [S47] | i18n | Has a Svelte component; worth a look as a reference |

**Takeaway:** no hosted CMP gives the exact custom UX plus all the integrations without a monthly fee. orestbida v3 or c15t are the best open-source references. A custom Svelte component built on the patterns above is feasible.

## 3. Integration notes

### Single source of truth
Store `{v, ts, region, analytics, marketing, preferences, gpc}` in a first-party cookie (`consent`, SameSite=Lax, 6-12 months) so the server can read it for SSR. Then fan out to every vendor from one `applyConsent()`.

### Google Consent Mode v2 (gtag.js)
Must run **before** gtag.js/GTM loads, on every page [S48]. No consent values are set by default [S48].
```js
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
// EEA + UK + CH: denied by default
gtag('consent', 'default', {
  ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  analytics_storage: 'denied', functionality_storage: 'granted',
  personalization_storage: 'denied', security_storage: 'granted',
  region: ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
           'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'],
  wait_for_update: 500
});
// Rest of world (owner decision; 'denied' everywhere is the safe option)
gtag('consent', 'default', {
  ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted',
  analytics_storage: 'granted', wait_for_update: 500
});
gtag('set', 'ads_data_redaction', true);
gtag('set', 'url_passthrough', true);
// On choice (and on every page load when a stored choice exists):
gtag('consent', 'update', {
  ad_storage: m, ad_user_data: m, ad_personalization: m, analytics_storage: a
}); // m/a = 'granted' | 'denied'
```
- `wait_for_update` gives the CMP time to call `update` before tags fire [S49].
- `ad_user_data` is required if you send first-party data, use enhanced conversions, or share GA4 conversions with Ads [S50].
- The region-list pattern (one region-specific default plus a global default) matches a real deployment [S51].
- For EEA traffic, advertisers must send consent signals via Consent Mode or TCF [S52].

### Microsoft UET consent mode
UET only reads `ad_storage` [S53]. If no default is set, UET assumes **granted** [S54]. Microsoft enforces Consent Mode in the EEA, UK and Switzerland [S36].
```js
window.uetq = window.uetq || [];
window.uetq.push('consent', 'default', { ad_storage: 'denied' });
// on choice:
window.uetq.push('consent', 'update', { ad_storage: m });
```
If you use the UET-Clarity integration, configure Clarity consent separately [S55].

### Meta pixel
```js
fbq('consent', 'revoke');      // BEFORE init
fbq('init', 'PIXEL_ID'); fbq('track', 'PageView');
// on marketing consent:
fbq('consent', 'grant');       // or 'revoke' on withdrawal
```
Revoke must come before `init`, or data may already be sent [S37, S56]. Even when revoked, the library still loads from Meta. Not loading the snippet at all until consent is the stricter option [S56]. **Recommendation for the EU: do not inject fbevents.js until marketing = granted.**

### TikTok pixel
Turn on Cookie Consent Mode for the pixel in TikTok Events Manager, then [S57]:
```js
ttq.holdConsent(); ttq.load('PIXEL_ID'); ttq.page();
// on choice:
ttq.grantConsent();  // or ttq.revokeConsent()
```
Server-side Events API calls also need a lawful basis, so stop them on revoke [S57].

### PostHog
- `cookieless_mode: 'always'`: PostHog never stores data in cookies or local/session storage, and counts users with a server-side privacy-preserving hash [S58]. No `identify()` allowed [S59].
- `cookieless_mode: 'on_reject'`: **no events are captured until consent is given or denied** [S58]. While pending or opted out, identity and session persistence are disabled. After `opt_in_capturing()` it leaves cookieless mode and normal persistence is allowed [S60]. Rejecters get cookieless analytics if the "Cookieless server hash" mode is enabled in project settings [S60].
- **Recommended config:**
```js
posthog.init(KEY, { api_host, defaults: '2026-08-30', cookieless_mode: 'on_reject' });
if (posthog.get_explicit_consent_status() === 'pending') showBanner();
// Accept (analytics): posthog.opt_in_capturing();
// Reject:            posthog.opt_out_capturing();
```
[S58, S61]
- Gotchas:
  - Use posthog-js ≥ 1.383.1 (a fix for `capture_pageview: false` when opting out in on_reject mode [S62]).
  - Older versions had a bug combining `opt_out_capturing_by_default` with on_reject [S59].
  - Keep `on_reject` (not `always`) if you need feature flags or `identify()` after acceptance [S60].
- On withdrawal: `posthog.reset(); posthog.opt_out_capturing();` [S60].

### Global Privacy Control
- Read `navigator.globalPrivacyControl === true` (client) or the `Sec-GPC: 1` header (server, in `hooks.server.ts`) [S63].
- Twelve US states require honouring it as an opt-out of sale/share and targeted ads: CA, CO, CT, DE, MD, MN, MT, NE, NH, NJ, OR, TX [S64]. California's, Colorado's and Connecticut's Attorneys General ran a joint GPC enforcement sweep in Sept 2025 [S65].
- **Behaviour:** in the US, GPC means marketing = denied automatically, with no banner needed. Show a small "Your opt-out preference signal was honoured" note in the preferences panel.
- In the EU, treat GPC as a hint to preselect nothing (everything is already off by default) and still show the banner.
- Optionally publish `/.well-known/gpc.json` [S66].

### Shopify (if the site runs on Shopify or Hydrogen)
Pass the same choice to `window.Shopify.customerPrivacy.setTrackingConsent({...})`, and use `shouldShowBanner()` to decide whether to show the banner [S41]. This is required for Shopify's own pixels and checkout to respect the choice [S40].

### IAB TCF v2.2 and GPP: do we need them?
- **TCF: no.** Google's certified-CMP/TCF requirement applies to **publishers** showing AdSense, Ad Manager or AdMob ads in the EEA/UK/CH [S52, S67]. An advertiser running Google Ads to its own website is not covered; it must send Consent Mode signals instead [S52, S67].
- **GPP:** this was not checked against a primary source. GPP (IAB Tech Lab's multi-jurisdiction string) is used to pass US opt-out signals to ad-tech vendors in programmatic chains. A site that sells no ad space has no downstream bidders to signal. Skip it, and revisit only if an ad partner explicitly requires a GPP/TCF string.

## 4. Sources
- [S1] Lexology, EDPB Taskforce summary: https://www.lexology.com/library/detail.aspx?g=cef8acc5-c5b9-45ae-9223-3a9e38e96354
- [S2] EDPB Cookie Banner Taskforce report (Jan 2023): https://www.edpb.europa.eu/system/files/2023-01/edpb_20230118_report_cookie_banner_taskforce_en.pdf ; datenschutz-notizen summary: https://www.datenschutz-notizen.de/the-edpb-releases-report-of-the-outcome-of-the-cookie-banner-task-force-1341372/
- [S3] Covington Inside Privacy: https://www.insideprivacy.com/eu-data-protection/edpb-publishes-report-of-cookie-banners-taskforce/
- [S4] Cleary Cyberwatch: https://www.clearycyberwatch.com/2023/02/key-takeaways-from-the-edpbs-cookie-banner-taskforce-report/
- [S5] ICO, How do we manage consent in practice: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/how-do-we-manage-consent-in-practice/
- [S6] Kukie, one-click reject (CNIL): https://kukie.io/blog/one-click-reject-eu-cookie-consent ; CNIL FAQ via Hogan Lovells: https://www.hoganlovells.com/en/publications/cnil-publishes-faq-clarifying-cookie-use ; Bird & Bird on CNIL enforcement: https://www.twobirds.com/en/insights/2025/france/cnil-continues-to-crumble-cookies-recent-enforcement-actions-impact-on-organisations-with-a-french-p
- [S7] CookieSentry, CNIL Shein/Google fines: https://cookiesentry.com/blog/cookies-still-tracking-after-reject-all
- [S8] UniConsent, reject-all rules by country: https://www.uniconsent.com/blog/reject-all-button-cookie-banner
- [S9] Consently vs Axeptio: https://consently.net/blog/consently-vs-axeptio
- [S10] TermsFeed Axeptio review: https://www.termsfeed.com/blog/axeptio-review/
- [S11] Scalebay on Axeptio (TUI France): https://www.scalebay.io/blog/how-axeptio-takes-the-stress-out-of-mobile-app-consent-management
- [S12] Axeptio Speedway case: https://www.axept.io/blog/interaction-rate-speedway
- [S13] Axeptio A/B testing: https://www.axept.io/blog/optimize-consent-banner-ab-testing
- [S14] Axeptio KPI definitions: https://support.axeptio.eu/en/articles/274078-the-different-kpis-in-detail
- [S15] Cookiebot Swift banner positions: https://support.cookiebot.com/hc/en-us/articles/26407083994524-Configuration-of-the-Swift-banner-in-the-Cookiebot-Manager
- [S16] Pandectes on ICO guidance: https://pandectes.io/blog/uk-cookie-compliance-what-the-latest-ico-guidance-means-for-you/
- [S17] TrustYourWebsite, UK ICO rules: https://trustyourwebsite.com/uk/en/guides/cookie-banner-rules-uk-ico
- [S18] Usercentrics app consent benchmark: https://usercentrics.com/knowledge-hub/app-ad-revenue-consent-calculator/
- [S20] Ignite, 29 cookie banner studies: https://www.ignite.video/en/articles/basics/cookie-consent-studies
- [S21] Cookie Information Nordic study: https://cookieinformation.com/resources/blog/consent-rates-and-marketing-performance/
- [S22] Kukie, consent-rate benchmarks (Utz et al.): https://kukie.io/blog/cookie-consent-rates-industry-benchmarks
- [S23] Utz et al. figures summary: https://termsandconditionstemplate.com/what-percentage-of-users-reject-all-cookies
- [S24] AudioEye WCAG 2.2: https://www.audioeye.com/post/whats-new-with-wcag-2-2/
- [S25] arXiv 2402.18321 (CMP user interactions): https://arxiv.org/pdf/2402.18321
- [S26] Deque WCAG 2.2: https://dequeuniversity.com/resources/wcag-2.2/
- [S27] Cookiebot Swift defaults: https://support.cookiebot.com/hc/en-us/articles/4403348431506-Configuration-of-the-Swift-banner
- [S28] OneTrust banner template docs: https://docs.onetrust.com/en/consent--preferences/cookie-consent/configuring-templates-and-geolocation-rules/customizing-the-banner-template
- [S29] OneTrust button set: https://my.onetrust.com/s/article/UUID-2b6cc670-059c-5342-275c-4a7d8da5630e?language=en_US
- [S30] CookieYes banner examples: https://www.cookieyes.com/blog/cookieyes-cookie-banner-examples/
- [S31] Osano CMP comparison (CookieYes, Didomi): https://www.osano.com/comparison/consent-management-platform
- [S32] Didomi web look and feel: https://developers.didomi.io/cmp/web-sdk/consent-notice/notice/look-and-feel
- [S33] Didomi mobile notice: https://developers.didomi.io/cmp/mobile-sdk/consent-notice/customize-the-notice
- [S34] Osano styling: https://docs.osano.com/hc/en-us/articles/22469433625620-Styling-Consent-Manager
- [S35] Osano plans: https://www.osano.com/plans
- [S36] Cookiebot UET setup: https://support.cookiebot.com/hc/en-us/articles/12452886794908-Setting-up-Microsoft-Universal-Event-Tracking-for-Consent-Mode
- [S37] Cookiebot Meta pixel consent: https://support.cookiebot.com/hc/en-us/articles/360004461894-Require-consent-before-loading-Facebook-pixel
- [S38] Termly WordPress plugin: https://wordpress.org/plugins/uk-cookie-consent/
- [S39] Termly banner generator: https://termly.io/products/cookie-banner-generator/
- [S40] Cookiebot on Shopify's banner: https://www.cookiebot.com/en/shopify-cookie-consent/
- [S41] Shopify Customer Privacy API: https://shopify.dev/docs/api/customer-privacy
- [S42] orestbida cookieconsent config reference: https://cookieconsent.orestbida.com/reference/configuration-reference.html
- [S43] Klaro overview (DeepWiki): https://deepwiki.com/kiprotect/klaro
- [S44] Klaro repo: https://github.com/kiprotect/klaro
- [S45] Klaro script tagging (fork README): https://github.com/abdullahceylan/klaro
- [S46] c15t Svelte banner: https://c15t.com/docs/shared/svelte/components/consent-banner.md
- [S47] c15t PostHog: https://c15t.com/docs/integrations/posthog
- [S48] Google, Set up consent mode: https://developers.google.com/tag-manager/consent
- [S49] Secure Privacy GCM params: https://support.secureprivacy.ai/article/google-consent-mode-v2-parameters-explained-url-passthrough-data-redaction-troub/
- [S50] Simo Ahava, Consent Mode V2: https://www.simoahava.com/analytics/consent-mode-v2-google-tags/
- [S51] GitLab GCM v2 issue: https://gitlab.com/gitlab-com/marketing/digital-experience/buyer-experience/-/issues/3503
- [S52] Google EU user consent policy help: https://www.google.com/intl/en_uk/about/company/user-consent-policy-help/
- [S53] PPC News Feed, Microsoft consent mode: https://ppcnewsfeed.com/blog/microsoft-advertising-consent-mode-complete-guide/
- [S54] UniConsent UET: https://www.uniconsent.com/docs/tutorials/microsoft-uet-consent-mode
- [S55] Microsoft Q&A, consent mode: https://learn.microsoft.com/en-us/answers/questions/2289656/microsoft-consent-mode
- [S56] DEV, Meta pixel before consent: https://dev.to/builderify/your-meta-pixel-is-tracking-visitors-before-they-accept-cookies-heres-how-to-fix-it-1af
- [S57] CookieBeam, TikTok consent: https://cookiebeam.com/guides/tiktok-pixel-events-api-consent-2026
- [S58] PostHog cookieless docs: https://posthog.com/docs/privacy/cookieless-tracking
- [S59] PostHog forum, on_reject behaviour: https://posthog.com/forum/p/cookieless-tracking-not-persisting-only-shows-in-live-tab
- [S60] Probo, PostHog flags behind a banner: https://www.probo.com/blog/2026-08-05-posthog-feature-flags-cookie-consent
- [S61] PostHog React banner tutorial: https://posthog.com/tutorials/react-cookie-banner
- [S62] posthog-js 1.383.1 release: https://github.com/PostHog/posthog-js/releases/tag/posthog-js@1.383.1
- [S63] CookieHub GPC: https://www.cookiehub.com/global-privacy-control
- [S64] WebLegal GPC guide: https://weblegal.ai/en/blog/global-privacy-control-complete-guide/
- [S65] Wikipedia, GPC: https://en.wikipedia.org/wiki/Global_Privacy_Control
- [S66] UniConsent GPC: https://www.uniconsent.com/global-privacy-control
- [S67] Consentbit, do you need a certified CMP: https://www.consentbit.com/blog/do-you-need-a-google-certified-cmp-what-googles-requirement-actually-means
