# Privacy and cookie consent (We Love Cookies)

How the store asks for cookie and tracking consent worldwide, and why. Engineering defaults, not legal advice.

| Document | What it covers |
| --- | --- |
| [how-it-works.md](how-it-works.md) | How the system works: pieces, data, owner screens, how to reuse it on another site |
| [privacy-requests-and-consent-sites.md](privacy-requests-and-consent-sites.md) | Shopper privacy requests (deadlines, owner queue, data summary) and the banner on other websites (site keys, exact-origin checks) |
| [consent-law-matrix.md](consent-law-matrix.md) | Research (Nov 2026): consent modes and the country / US-state table, what to log, required links |
| [consent-ux-research.md](consent-ux-research.md) | Research (Nov 2026): leading consent banners, honest ways to raise acceptance, regulator limits, integrations |

Code: `src/lib/consent/` (browser core, see its [README](../../src/lib/consent/README.md)). Server, database and owner screens: `reference/server/` (`src/lib/server/consent/`, `src/routes/api/consent/`, `src/routes/admin/privacy/`, `src/routes/(store)/privacy-choices/`, `migrations/`). Paths cited in these documents are relative to that folder.
