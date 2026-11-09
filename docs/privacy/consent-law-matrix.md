# Cookie consent rules matrix (engineering defaults, not legal advice)
As of 3 November 2026. Inputs: Cloudflare `request.cf.country` (ISO 3166-1 alpha-2) and `request.cf.regionCode` (US state; "QC" for Quebec).

## 1. Modes

| | opt-in | opt-in-uk | opt-in-light | opt-out-gpc | opt-out | notice |
|---|---|---|---|---|---|---|
| Loads before choice | Strictly necessary only | Strictly necessary + first-party aggregate analytics + preferences (functional/appearance; no third-party sharing, no ad use) | Strictly necessary only (default; prefer blocking) | All categories, except ad/sale tags are suppressed if GPC=1 | All categories | All categories |
| First-layer buttons | Accept all, Reject all, Choose | Accept all, Reject all, Choose, plus an "object to analytics" control | Accept, Reject (or Settings), Choose | None required; banner optional. Footer link "Do Not Sell or Share My Personal Information" / "Your Privacy Choices" | Footer link "Your Privacy Choices" / opt-out of targeted ads and sale | Footer link to cookie notice |
| Reject on first layer, as easy as Accept | Yes | Yes | Yes (recommended; mandatory in BR per ANPD guidance) | n/a (opt-out must be symmetric, no dark patterns, CCPA regs 7004) | n/a | n/a |
| Granular categories | Yes | Yes | Yes | Opt-out per purpose | Opt-out per purpose | No |
| Honor GPC | Recommended: treat as Reject for ads | Recommended | Recommended | **Legally required**; display "opt-out honored" status (CA) | Recommended (default on for all US) | Recommended |
| Consent log | Required in practice (burden of proof) | Required | Required | Log opt-out requests and GPC detection | Log opt-outs | Not required |
| Re-ask | Not before 6 months after a choice (CNIL practice ~6 months, max ~13 months cookie lifetime); on any new purpose/vendor | Same | 6-12 months | Do not re-prompt after an opt-out for 12 months (CCPA regs) [unverified] | Same | Never |
| Cookieless/aggregate analytics exempt | No in law today (Omnibus exemption not adopted); some DPAs (e.g. CNIL) exempt strictly configured audience measurement | Yes, with notice + free objection | Generally yes if not personal data | Yes | Yes | Yes |

Implementation default: always block ad/sale tags when `navigator.globalPrivacyControl === true` or `Sec-GPC: 1`, in every mode.

## 2. Mapping

### Countries
| Code(s) | Mode | Reason |
|---|---|---|
| AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE | opt-in | ePrivacy Art. 5(3) + GDPR consent; Digital Omnibus not adopted (Council position 21 Oct 2026 keeps cookies in ePrivacy, re-ask wait 4 months after refusal, browser-signal article deleted) |
| IS LI NO | opt-in | EEA: same GDPR/ePrivacy rules |
| GB | opt-in-uk | PECR as amended by DUAA s.112, in force 5 Feb 2026: statistics/appearance exceptions with info + opt-out; ads still need consent |
| CH | opt-out | nFADP: inform + allow opt-out; consent for high-risk profiling (vendor reading; FDPIC not checked) |
| US | see states | State laws (opt-out); federal none |
| CA (not QC) | opt-out | PIPEDA/OPC: opt-out OK for non-sensitive behavioural ads if clear and immediate |
| CA + regionCode QC | opt-in | Quebec Law 25 s.8.1: identifying/locating/profiling tech off by default |
| BR | opt-in | LGPD + ANPD cookie guide (2022): consent for non-essential; accept/reject on first layer |
| MX | opt-in-light | LFPDPPP (2025 replacement law) consent/notice model [unverified] |
| AR | opt-in-light | Law 25,326 consent; one vendor lists opt-in [unverified] |
| CL | opt-in-light | Law 21,719 (GDPR-like) taking effect Dec 2026 [unverified, verify date] |
| CO | opt-in-light | Law 1581/2012 prior consent for personal data [unverified] |
| CN | opt-in | PIPL consent; separate consent for sensitive data and cross-border transfer |
| JP | notice | APPI + Telecom Business Act external transmission: notify/publish, consent, or opt-out; disclosure page is the norm |
| KR | opt-in | PIPA: prior consent where cookie data identifies a person |
| IN | opt-in-light | DPDP Rules notified Nov 2025; consent managers 13 Nov 2026; core consent duties 13 May 2027 (switch to opt-in then) |
| SG | opt-in-light | PDPA consent/deemed consent (vendor) |
| TH | opt-in | PDPA + PDPC cookie guidance: opt-in, equal-prominence reject (vendor) |
| VN | opt-in | Law 91/2025/QH15 in force 1 Jan 2026; online tracking data is sensitive; prior acceptance before cookies |
| ID | opt-in-light | PDP Law 27/2022 consent-based, in force Oct 2024 [unverified] |
| PH | opt-in-light | DPA 2012 consent [unverified] |
| AU | notice | Privacy Act: no cookie consent rule; tranche 2 not introduced; Children's Code due 10 Dec 2026 |
| NZ | notice | Privacy Act 2020: notice-based (vendor) |
| ZA | opt-in-light | POPIA: lawful basis + notice; opt-in for e-direct marketing (s.69) |
| NG | opt-in | NDPA + GAID (effective 19 Sep 2025): prominent banner, accept/decline, only strictly necessary exempt |
| KE | opt-in-light | DPA 2019 consent [unverified] |
| TR | opt-in | KVKK cookie guideline: explicit consent for non-essential (vendor) |
| SA | opt-in | PDPL: consent default basis; enforcement active |
| AE | opt-in-light | Federal PDPL 45/2021 consent [unverified; DIFC/ADGM free zones stricter] |
| IL | opt-in-light | PPL Amendment 13 (Aug 2025) [unverified] |
| any other | opt-in | Safe default |

### US states
| Mode | States | Reason |
|---|---|---|
| opt-out-gpc (12) | CA CO CT DE MD MN MT NE NH NJ OR TX | Comprehensive law + legal duty to honor universal opt-out (GPC); CA also must show the signal was processed (11 CCR 7025, Jan 2026) |
| opt-out (8) | VA UT FL IA TN IN KY RI | Comprehensive law, opt-out of sale/targeted ads, no GPC mandate |
| notice (30 + DC) | AL AK AZ AR GA HI ID IL KS LA ME MA MI MS MO NV NM NY NC ND OH OK PA SC SD VT WA WV WI WY DC | No comprehensive law in force; privacy policy (CalOPPA-style) only. NY AG guidance expects working decline controls if offered |

Recommendation: honor GPC for all US visitors (most teams do; avoids state misdetection).

## 3. Proof-of-consent log
Fields: consent ID (random UUID, stored in first-party cookie), timestamp (UTC ISO 8601), country + regionCode, mode applied, banner/config version and cookie-policy version hash, language, choice per category (preferences/analytics/marketing; necessary is always on), action (accept_all, reject_all, custom, acknowledge, withdraw, gpc), GPC/Sec-GPC value, user agent, truncated IP or hash (avoid full IP), page URL, customer ID if logged in.
Retention: keep each record for the life of the consent plus a limitation buffer; engineering default 5 years for opt-in regions (burden of proof under GDPR Art. 7(1), LGPD, POPIA, India). US opt-out request records: 24 months (CCPA regs 7101) [unverified]. Consent cookie itself: 6 months (opt-in), 12 months (others).

## 4. Required visitor-facing pages/links
- Cookie policy/list: every cookie/tag, purpose, provider, lifetime, third-party recipients (EU, UK, BR, JP external transmission, KR, all opt-in).
- Privacy policy with notice at collection (all; CA, Quebec in French, BR in Portuguese, SA in Arabic recommended).
- Persistent "Cookie settings" link to reopen preferences and withdraw (all opt-in modes; UK objection control).
- "Do Not Sell or Share My Personal Information" (CA) or "Your Privacy Choices" with the CPPA icon; opt-out of targeted ads link in other opt-out states.
- "Limit the Use of My Sensitive Personal Information" (CA, only if sensitive PI is used beyond permitted purposes); other states require opt-in consent for sensitive data instead.
- GPC status indicator ("Opt-out preference signal honored") for CA.
- Contact/privacy officer details (Quebec Law 25, NG, BR DPO, UK complaints procedure from June 2026).

## 5. Open uncertainties
- Digital Omnibus: Parliament position and trilogue pending; if adopted, the 4-month re-ask rule and audience-measurement exemption will change EU mode. Recheck quarterly.
- Maryland: some sources say its signal duty differs structurally from the other 11.
- Pennsylvania and other 2026 enactments: one source mentions a new PA law; effective dates not verified. WA/NV health-data laws (MHMDA) not mapped.
- Rows marked [unverified] (MX, AR, CL, CO, ID, PH, KE, AE, IL) rest on general knowledge, not checked sources.
- CH, TH, TR, SG, NZ rely on vendor guides; vendor guides disagree (e.g. some list CH and IN as opt-in).
- Japan: APPI amendment bill (Apr 2026) may cover cookie IDs by ~2028.
- India flips to opt-in on 13 May 2027.

## Sources
- https://www.uniconsent.com/blog/digital-omnibus-cookie-rules
- https://continentalbrief.org/digital-omnibus-gdpr-cookies-data-act-explained
- https://cookie-script.com/privacy-laws/eu-digital-omnibus-cookie-reform
- https://www.osborneclarke.com/what-our-clients-are-talking-about/digital-regulation/digital-omnibus-package
- https://bratby.law/data-use-and-access-act-2025-commencement/
- https://www.policypros.co.uk/cookie-consent-changes-duaa-guide/
- https://cookiechimp.com/blog/do-analytics-cookies-require-consent
- https://cookiechimp.com/blog/cookie-banner-requirements-in-us-states
- https://www.clym.io/blog/what-is-global-privacy-control-the-opt-out-signal-12-us-states-now-require-you-to-honor
- https://cookie-script.com/privacy-laws/universal-opt-out-mechanisms-in-us-privacy-laws-gpc-requirements-by-state
- https://blog.clickpointsoftware.com/state-opt-out-requirements
- https://cookiechimp.com/blog/cookie-consent-laws-outside-the-eu-and-us
- https://cookiechimp.com/blog/where-is-opt-in-cookie-consent-required
- https://www.cookiebot.com/en/law-25/
- https://www.dlapiperdataprotection.com/?t=law&c=VN
- https://www.convergedigital.in/blog/dpdp-rules-2025-compliance-timeline
- https://wpconsent.com/cookie-consent-wordpress-requirements-by-country/
- https://kukie.io/blog/cookie-consent-laws-by-country-overview
- https://cookiebeam.com/guides/global-cookie-consent-laws-2026
