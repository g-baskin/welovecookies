# Privacy and cookie consent (Ecom Cookie)

How the store asks for cookie and tracking consent worldwide, and why. Engineering defaults, not legal advice.

| Document | What it covers |
| --- | --- |
| [ecom-cookie.md](ecom-cookie.md) | How the system works: pieces, data, owner screens, how to reuse it on another site |
| [privacy-requests-and-consent-sites.md](privacy-requests-and-consent-sites.md) | Shopper privacy requests (deadlines, owner queue, data summary) and the banner on other websites (site keys, exact-origin checks) |
| [consent-law-matrix.md](consent-law-matrix.md) | Research (Nov 2026): consent modes and the country / US-state table, what to log, required links |
| [consent-ux-research.md](consent-ux-research.md) | Research (Nov 2026): leading consent banners, honest ways to raise acceptance, regulator limits, integrations |

Code: `src/lib/consent/` (browser core, see its [README](../../src/lib/consent/README.md)). The store's server, database and admin code is kept for reference under `reference/ecom-bliss/` (same paths as in ecom-bliss).
