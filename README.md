# welovecookies

Cookie consent and tracking rules for websites and stores, so tracking only runs where the visitor's location allows it. Brought over from **Ecom Cookie** in the ecom-bliss project (commit `1aa4519`, branch `feature/dropship-ai-autonomy`, 9 Nov 2026).

> Engineering defaults, not legal advice. Have the rules table and the banner texts checked for your business, and re-check them at least yearly.

## What is here

| Path | What it is |
| --- | --- |
| `src/lib/consent/` | The banner, preferences panel and consent manager (no framework, 20 languages). See its [README](src/lib/consent/README.md) |
| `src/lib/consent/regions.ts` | **The rules table**: consent mode per country, Canadian province and US state, and what each mode allows |
| `src/lib/storefront/visitor-pixel.ts` | US all-party-consent (wiretap) state list and the "needs an explicit click" rule for identifying pixels. It still contains the store's own vendor tag |
| `docs/privacy/` | The research behind the rules: law matrix with sources, banner UX research, how the system works, privacy requests |
| `static/consent/` | Built one-file script (`ecom-cookie.min.js`, `ecom-cookie.mjs`) and `demo.html` |
| `tools/build-consent.mjs` | Rebuilds `static/consent/` from `src/lib/consent/` |
| `reference/ecom-bliss/` | Store-specific code kept as-is (same paths as ecom-bliss): proof-of-consent log, database tables and migrations, consent API, admin Privacy & cookies screens, privacy requests, weekly tracking check, compliance register. It needs the ecom-bliss app (SvelteKit, Cloudflare D1, Drizzle) and does not run here |

## Commands

```sh
npm install
npm test        # unit tests for the banner, rules table and wiretap list
npm run check   # TypeScript
npm run build   # rebuild static/consent/
```
