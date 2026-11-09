<!-- gg:init:start -->
# We Love Cookies

A cookie consent banner sold as a product for any website. It is framework-free and makes no outside requests unless configured. The core product is the one-tag script (`dist/welovecookies.min.js`). The ESM module (`dist/welovecookies.mjs`) and the WordPress plugin zip are extra install paths.

## Parts
- `src/lib/consent/standalone.ts` provides the `window.WeLoveCookies` global (built to the IIFE); `index.ts` is the ESM API.
- `consent.ts` is the manager: mode, cookie, signals, UI and record/seen POSTs. `regions.ts` maps country/US state/time zone to a mode, plus the rules for each mode. `cookie.ts` is the cookie wire format.
- `wiretap.ts` (US all-party-consent states) is a helper for buyers. The banner never calls it, and `modeFor()` is likewise only for server-side use.
- `admin/` is the optional Cloudflare Worker + D1 admin (ADR 0007, `docs/ADMIN.md`). `src/index.ts` routes everything and runs the daily cron; `config.ts` and `record.ts` are the hosted-install endpoints, `privacy.ts` is the hosted request form, `pages/` is the server-rendered admin. It imports `../../src/lib/consent/*.ts` directly, so changes there affect it too.
- `wordpress/welovecookies/welovecookies.php` prints an inline `WeLoveCookiesConfig` plus the script at `wp_head` priority 1, a `welovecookies_config` filter and the `[welovecookies_settings]` shortcode.

## Config and mode resolution
- Precedence, later wins: defaults → script `data-*` → `window.WeLoveCookiesConfig` → `init()` args. With `data-site` (hosted install), the config fetched from `/api/consent/config` on the script's origin is passed as the `init()` args, so it overrides everything else.
- `mode: 'auto'` guesses from the browser's IANA time zone and falls back to `opt-in`. There is no IP/country lookup in the browser.

## Gotchas
- **`dist/` is committed build output.** After any change in `src/lib/consent/`, run `npm run build` and commit `dist/`. `src/lib/consent/dist.test.ts` fails when the committed `welovecookies.min.js`/`welovecookies.mjs` differ from a fresh build (the WordPress zip isn't compared). The jsDelivr URL in docs serves `dist/` straight from the `main` branch.
- **The WordPress plugin JS exists only inside the zip.** `wordpress/welovecookies/assets/` is gitignored and filled by the build. The build needs the system `zip` binary.
- **Bump `Version:` and `WELOVECOOKIES_VERSION` in welovecookies.php together** when shipping new JS. The script URL uses `?ver=` for caching, so WordPress sites keep the old file otherwise.
- **i18n rows are positional 32-field tuples** (`i18n/row.ts`, mapped by index in `i18n.ts` `toTexts`). Adding or reordering a field means editing `row.ts`, `toTexts` and every row in `i18n/a.ts`–`d.ts`. Swapped strings still typecheck. Any wording change must cover all 20 languages. Rows are `// prettier-ignore`; don't reformat them.
- **The cookie `wlc_consent` value `1.<id>.<at36>.<rev>.<mode>.<pam>.<action>` is a wire contract.** Changing it, `MODE_CODE`/`ACTION_CODE` or the cookie name makes every saved choice decode as null, so all visitors get asked again. `contract.test.ts` pins the format.
- **Legal data is dated.** `ALL_PARTY_STATES_CHECKED` in `wiretap.ts` (2026-11-03, re-check every 6 months). The `regions.ts` tables are "as of Nov 2026", and `types.ts` notes India's lighter rules until 2027. Unknown places default to the strictest behaviour on purpose.
- **`regions.ts` is the source of truth, not `docs/privacy/consent-law-matrix.md`.** Example: the matrix says CH is opt-out, but the code asks first (`CH: 'opt-in'`) on purpose.
- **Keep `.npmrc` `legacy-peer-deps=true` and the direct `vite` devDependency.** Together they work around an npm arborist "edgesOut" crash caused by vitest 5's optional peers, and `npm install` fails without them.
- **This is a generic product for any website.** Don't add store/shop/cart/product wording to texts, docs or examples, and don't reference any earlier project it came from.
- **Licence is AGPL-3.0-only, dual-licensed** (owner sells commercial licences). The `/*! ... AGPL-3.0-only | Source: ... */` banner added in `tools/build-consent.mjs` must stay in `dist/` files: it is how sites serving the script pass on the terms and source link. Keep the LICENSE text verbatim from gnu.org.
- **Admin migrations are forward-only.** Never edit `admin/migrations/0001_init.sql` once released; add `0002_...sql` and list it in `MIGRATIONS` in `admin/src/test-d1.ts`. Tests run the real SQL on `node:sqlite` (`test-d1.ts`), not D1, so keep to SQL both support. Multi-row writes go through `db.batch()` (D1 has no BEGIN).
- **Admin HTML escapes by default.** Build markup with the `html` tag in `admin/src/html.ts`; `raw()` is for trusted markup only. The CSP blocks inline styles and scripts, so styles go in `CSS` there.
- **`admin/public/` is gitignored** and filled by `npm run build` or `npm run admin:assets`. `admin/wrangler.jsonc` ships a placeholder `database_id` that the buyer replaces. `npm run check` also runs `tsc -p admin`.
- **It is not a WordPress plugin** (owner's explicit direction). README and docs must lead with the plain script-tag install for any site or framework (`docs/INSTALL.md` has per-framework sections). WordPress is one optional row among many; never frame the product around it.

## Workflow
- Domain terms are defined in `CONTEXT.md`; use those names. Record new hard-to-reverse decisions as the next numbered ADR in `docs/decisions/`.
- Docs layout: buyer docs in `docs/`, the hosted endpoint spec in `docs/api/openapi.json`, user-visible changes under `[Unreleased]` in `CHANGELOG.md`. `library/` (Library Schema v2) holds maintainer notes and the code wiki (`library/knowledge/private/codebase-graph/`, one page per module, navigation in its `README.md`). ADRs stay in `docs/decisions/`, not `library/`. `library/notes/` is human-only.
- `src/docs.test.ts` fails when a wiki citation (`path:`/`sources:`/`tested_by:` or a backticked `dir/file:line`) points past the file, a `[[wiki link]]` or relative Markdown link breaks, or the OpenAPI mode/action/device enums differ from `CONSENT_MODES`/`CONSENT_ACTIONS`/`DEVICES`. When you change a module, update its wiki page (and the spec for admin endpoint changes).
- Branches: `feature/*` → PR into `dev`. `main` is the release branch the CDN URL follows. There is no CI and there are no tags yet.
- Only `dev` and `main` live on GitHub. Delete each feature branch (remote and local) once its PR is merged.
- To release, merge a `dev` → `main` PR, then fast-forward `dev` to `main` (`git checkout dev && git fetch origin && git merge --ff-only origin/main && git push origin dev`) so the two branches are 0 commits apart. Never force-push either branch.
- `npm run demo` serves `/demo/`, `/dist/` and `/docs/assets/` only, on http://localhost:4173/demo/ (cookies need http). It loads `../dist/`, so build first. Preview other regions and languages with `?mode=opt-in|opt-out-gpc|notice&lang=xx&gpc=1&prefs=1`.
<!-- gg:init:end -->
