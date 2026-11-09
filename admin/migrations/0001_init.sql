-- We Love Cookies admin: first schema. Forward-only: never edit this file after it has been applied;
-- put changes in a new numbered file (0002_...). No IP address is ever stored.

-- One row per connected website. Websites are switched off, never deleted, so their records stay.
CREATE TABLE sites (
	key TEXT PRIMARY KEY CHECK (key GLOB 'ws_*' AND length(key) = 15),
	name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
	-- The exact origin allowed to load the config and send records, e.g. https://example.com
	origin TEXT NOT NULL UNIQUE CHECK (origin GLOB 'https://*' OR origin GLOB 'http://localhost*' OR origin GLOB 'http://127.0.0.1*'),
	privacy_url TEXT NOT NULL DEFAULT '' CHECK (privacy_url = '' OR privacy_url GLOB 'https://*'),
	enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
	settings_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(settings_json)),
	rev INTEGER NOT NULL DEFAULT 1 CHECK (rev >= 1),
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);

-- Proof of consent: one row per choice. Kept 5 years, then deleted by the daily job.
CREATE TABLE consent_records (
	id INTEGER PRIMARY KEY,
	site TEXT NOT NULL REFERENCES sites(key) ON DELETE RESTRICT,
	consent_id TEXT NOT NULL CHECK (length(consent_id) = 16),
	created_at INTEGER NOT NULL,
	action TEXT NOT NULL CHECK (action IN ('accept_all', 'reject_all', 'custom', 'acknowledge', 'withdraw', 'gpc')),
	preferences INTEGER NOT NULL CHECK (preferences IN (0, 1)),
	analytics INTEGER NOT NULL CHECK (analytics IN (0, 1)),
	marketing INTEGER NOT NULL CHECK (marketing IN (0, 1)),
	mode TEXT NOT NULL CHECK (mode IN ('opt-in', 'opt-in-uk', 'opt-in-light', 'opt-out-gpc', 'opt-out', 'notice')),
	country TEXT CHECK (country IS NULL OR length(country) = 2),
	region_code TEXT CHECK (region_code IS NULL OR length(region_code) <= 3),
	rev INTEGER NOT NULL CHECK (rev >= 0),
	lang TEXT NOT NULL DEFAULT '' CHECK (length(lang) <= 12),
	device TEXT NOT NULL CHECK (device IN ('phone', 'tablet', 'desktop')),
	gpc INTEGER NOT NULL CHECK (gpc IN (0, 1)),
	page TEXT NOT NULL DEFAULT '' CHECK (length(page) <= 200),
	user_agent TEXT NOT NULL DEFAULT '' CHECK (length(user_agent) <= 200)
);
CREATE INDEX consent_records_lookup ON consent_records (site, consent_id);
CREATE INDEX consent_records_site_time ON consent_records (site, created_at);
CREATE INDEX consent_records_time ON consent_records (created_at);

-- Cookieless daily counters: banner views ('seen') and each kind of answer.
CREATE TABLE consent_daily (
	day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	site TEXT NOT NULL REFERENCES sites(key) ON DELETE RESTRICT,
	metric TEXT NOT NULL CHECK (metric IN ('seen', 'accept_all', 'reject_all', 'custom', 'acknowledge', 'withdraw', 'gpc')),
	mode TEXT NOT NULL,
	country TEXT NOT NULL DEFAULT '',
	device TEXT NOT NULL,
	count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
	PRIMARY KEY (day, site, metric, mode, country, device)
);

-- What the banner said and which cookies it listed, per website and revision: proof of what was shown.
CREATE TABLE consent_versions (
	site TEXT NOT NULL REFERENCES sites(key) ON DELETE RESTRICT,
	rev INTEGER NOT NULL CHECK (rev >= 1),
	created_at INTEGER NOT NULL,
	texts_json TEXT NOT NULL CHECK (json_valid(texts_json)),
	cookies_json TEXT NOT NULL CHECK (json_valid(cookies_json)),
	PRIMARY KEY (site, rev)
);

-- Privacy requests from the hosted "Ask about your data" form. Kept until the owner deletes them.
CREATE TABLE privacy_requests (
	id TEXT PRIMARY KEY,
	site TEXT NOT NULL REFERENCES sites(key) ON DELETE RESTRICT,
	created_at INTEGER NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('delete', 'copy', 'correct', 'stop_selling')),
	status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'done', 'declined')),
	email TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
	name TEXT NOT NULL DEFAULT '' CHECK (length(name) <= 120),
	message TEXT NOT NULL DEFAULT '' CHECK (length(message) <= 1000),
	country TEXT CHECK (country IS NULL OR length(country) = 2),
	region_code TEXT CHECK (region_code IS NULL OR length(region_code) <= 3),
	due_at INTEGER NOT NULL,
	closed_at INTEGER,
	note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 2000)
);
CREATE INDEX privacy_requests_site_status ON privacy_requests (site, status, due_at);
CREATE INDEX privacy_requests_email ON privacy_requests (email, created_at);

-- Latest tracking & compliance check per website.
CREATE TABLE check_results (
	site TEXT PRIMARY KEY REFERENCES sites(key) ON DELETE RESTRICT,
	at INTEGER NOT NULL,
	issues_json TEXT NOT NULL CHECK (json_valid(issues_json))
);

-- Failed sign-ins and privacy-form posts, keyed by a keyed hash of the IP address (never the
-- address itself), for rate limits. Cleared daily.
CREATE TABLE rate_events (
	id INTEGER PRIMARY KEY,
	kind TEXT NOT NULL CHECK (kind IN ('login', 'request')),
	ip_hash TEXT NOT NULL CHECK (length(ip_hash) <= 64),
	at INTEGER NOT NULL
);
CREATE INDEX rate_events_kind_ip_time ON rate_events (kind, ip_hash, at);
