// Banner settings per website (sites.settings_json) and the version log (consent_versions).
// Changing wording, the cookie list or the Preferences category raises the revision, so every
// visitor is asked again, and keeps a snapshot of what was shown: proof of what visitors saw.
import {
	BANNER_POSITIONS,
	CONSENT_CATEGORIES,
	type BannerPosition,
	type ConsentIntegrations,
	type ConsentTheme,
	type CookieInfo
} from '../../src/lib/consent/types.ts';
import type { Db, SiteRow } from './db.ts';

/** Banner wording the owner can change (everything else keeps the built-in translations). */
export const EDITABLE_TEXTS = [
	{ key: 'title', label: 'Heading', max: 200, long: false },
	{ key: 'body', label: 'Message where visitors must agree first (EU, UK, Brazil…)', max: 1000, long: true },
	{ key: 'noticeBody', label: 'Message where visitors can opt out (most US privacy states, Canada…)', max: 1000, long: true },
	{ key: 'acceptAll', label: '“Accept all” button', max: 60, long: false },
	{ key: 'rejectAll', label: '“Reject all” button', max: 60, long: false },
	{ key: 'customize', label: '“Choose” button', max: 60, long: false },
	{ key: 'acknowledge', label: '“OK” button', max: 60, long: false },
	{ key: 'reopen', label: '“Cookie settings” link', max: 60, long: false }
] as const;
export type TextKey = (typeof EDITABLE_TEXTS)[number]['key'];
export type TextOverrides = Partial<Record<TextKey, string>>;

/** "*" = every language; otherwise a built-in language code. */
export const BANNER_LANGUAGES: { code: string; name: string }[] = [
	{ code: '*', name: 'Every language' },
	...[
		['en', 'English'], ['de', 'German'], ['fr', 'French'], ['es', 'Spanish'], ['it', 'Italian'],
		['pt', 'Portuguese'], ['nl', 'Dutch'], ['pl', 'Polish'], ['sv', 'Swedish'], ['da', 'Danish'],
		['fi', 'Finnish'], ['nb', 'Norwegian'], ['cs', 'Czech'], ['ro', 'Romanian'], ['el', 'Greek'],
		['tr', 'Turkish'], ['ja', 'Japanese'], ['ko', 'Korean'], ['zh', 'Chinese'], ['ar', 'Arabic']
	].map(([code, name]) => ({ code, name }))
]; // prettier-ignore
const LANG_CODES = new Set(BANNER_LANGUAGES.map((l) => l.code));

export const THEME_FIELDS = [
	{ key: 'primary', label: 'Button color' },
	{ key: 'primaryFg', label: 'Button text color' },
	{ key: 'bg', label: 'Background' },
	{ key: 'fg', label: 'Text color' },
	{ key: 'border', label: 'Border color' },
	{ key: 'radius', label: 'Corner rounding' },
	{ key: 'buttonRadius', label: 'Button corner rounding' },
	{ key: 'font', label: 'Font' }
] as const satisfies readonly { key: keyof ConsentTheme; label: string }[];
type ThemeKey = (typeof THEME_FIELDS)[number]['key'];
const CSS_CHARS_RE = /^[^;{}<>\\"'`@]{0,120}$/;
/** A CSS value that cannot break out of its declaration or load anything from another server. */
export const safeCssValue = (v: string) => CSS_CHARS_RE.test(v) && !/(url|image-set|image|element|src)\s*\(/i.test(v);

export const INTEGRATIONS = [
	{ key: 'googleConsentMode', label: 'Google Consent Mode v2 (Google Analytics, Google Ads)' },
	{ key: 'microsoftUet', label: 'Microsoft Advertising (UET)' },
	{ key: 'meta', label: 'Meta Pixel' },
	{ key: 'tiktok', label: 'TikTok Pixel' },
	{ key: 'posthog', label: 'PostHog' },
	{ key: 'scriptBlocking', label: 'Hold back tagged scripts until allowed (data-consent)' }
] as const satisfies readonly { key: keyof ConsentIntegrations; label: string }[];

export interface SiteSettings {
	enabled: boolean;
	position: BannerPosition;
	floatingButton: boolean;
	preferencesCategory: boolean;
	noticeBanner: { optOut: boolean; notice: boolean };
	theme: Partial<Record<ThemeKey, string>>;
	texts: Record<string, TextOverrides>;
	cookies: CookieInfo[];
	integrations: ConsentIntegrations;
}

export const MAX_COOKIES = 200;
export const DEFAULT_COOKIES: CookieInfo[] = [
	{
		name: 'wlc_consent',
		label: 'Your cookie choice',
		provider: 'This website',
		category: 'necessary',
		purpose: 'Remembers your cookie choice so we do not ask on every page.',
		duration: '6 to 12 months'
	}
];

export const defaultSettings = (): SiteSettings => ({
	enabled: true,
	position: 'auto',
	floatingButton: true,
	preferencesCategory: false,
	noticeBanner: { optOut: true, notice: false },
	theme: {},
	texts: {},
	cookies: structuredClone(DEFAULT_COOKIES),
	integrations: {
		googleConsentMode: false,
		microsoftUet: false,
		meta: false,
		tiktok: false,
		posthog: false,
		scriptBlocking: true
	}
});

const isObj = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
/** Trimmed string within the limit, else null. */
export const text = (v: unknown, max: number, min = 0): string | null => {
	if (typeof v !== 'string') return null;
	const t = v.trim();
	return t.length >= min && t.length <= max ? t : null;
};

/** One cookie-list row, or an error message in plain words. */
export function parseCookie(v: unknown): { ok: true; cookie: CookieInfo } | { ok: false; error: string } {
	if (!isObj(v)) return { ok: false, error: 'Fill in the cookie details.' };
	const name = text(v.name, 80, 1);
	const provider = text(v.provider, 80, 1);
	const purpose = text(v.purpose, 300, 1);
	const duration = text(v.duration, 40, 1);
	const label = v.label === undefined ? '' : text(v.label, 80);
	const category = (CONSENT_CATEGORIES as readonly unknown[]).includes(v.category)
		? (v.category as CookieInfo['category'])
		: null;
	if (!name) return { ok: false, error: 'Give the cookie its name (up to 80 characters).' };
	if (!provider) return { ok: false, error: 'Say who sets the cookie (up to 80 characters).' };
	if (!purpose) return { ok: false, error: 'Say what the cookie is for in one sentence (up to 300 characters).' };
	if (!duration) return { ok: false, error: 'Say how long the cookie lasts, like “1 year” (up to 40 characters).' };
	if (label === null) return { ok: false, error: 'Use a shorter plain name (up to 80 characters).' };
	if (!category) return { ok: false, error: 'Choose a category.' };
	return { ok: true, cookie: { name, ...(label ? { label } : {}), provider, category, purpose, duration } };
}

/** Saved settings over the defaults; anything invalid falls back to its default. */
export function parseSettings(raw: unknown): SiteSettings {
	const d = defaultSettings();
	let v: unknown = raw;
	if (typeof raw === 'string') {
		try {
			v = JSON.parse(raw);
		} catch {
			return d;
		}
	}
	if (!isObj(v)) return d;
	const theme: SiteSettings['theme'] = {};
	if (isObj(v.theme))
		for (const { key } of THEME_FIELDS) {
			const t = text(v.theme[key], 120, 1);
			if (t && safeCssValue(t)) theme[key] = t;
		}
	const texts: SiteSettings['texts'] = {};
	if (isObj(v.texts))
		for (const [lang, o] of Object.entries(v.texts)) {
			if (!LANG_CODES.has(lang) || !isObj(o)) continue;
			const one: TextOverrides = {};
			for (const { key, max } of EDITABLE_TEXTS) {
				const t = text(o[key], max, 1);
				if (t) one[key] = t;
			}
			if (Object.keys(one).length) texts[lang] = one;
		}
	const cookies = Array.isArray(v.cookies)
		? v.cookies.slice(0, MAX_COOKIES).flatMap((c) => {
				const p = parseCookie(c);
				return p.ok ? [p.cookie] : [];
			})
		: d.cookies;
	const nb = isObj(v.noticeBanner) ? v.noticeBanner : {};
	const int = isObj(v.integrations) ? v.integrations : {};
	return {
		enabled: bool(v.enabled, d.enabled),
		position: (BANNER_POSITIONS as readonly unknown[]).includes(v.position)
			? (v.position as BannerPosition)
			: d.position,
		floatingButton: bool(v.floatingButton, d.floatingButton),
		preferencesCategory: bool(v.preferencesCategory, d.preferencesCategory),
		noticeBanner: { optOut: bool(nb.optOut, d.noticeBanner.optOut), notice: bool(nb.notice, d.noticeBanner.notice) },
		theme,
		texts,
		cookies,
		integrations: Object.fromEntries(
			INTEGRATIONS.map(({ key }) => [key, bool(int[key], d.integrations[key])])
		) as unknown as ConsentIntegrations
	};
}

export const siteSettings = (site: Pick<SiteRow, 'settings_json'>) => parseSettings(site.settings_json);

/** The parts whose change means visitors must be asked again. A display label changes no cookie. */
export const askedAgainKey = (s: SiteSettings) =>
	JSON.stringify([
		Object.keys(s.texts).sort().map((lang) => [lang, EDITABLE_TEXTS.map(({ key }) => s.texts[lang][key] ?? '')]),
		s.cookies.map(({ label: _, ...c }) => c),
		s.preferencesCategory
	]);

/** Snapshot of what the site shows at `rev` (default: its current revision); keeps an existing one. */
export const snapshotStmt = (db: Db, key: string, s: SiteSettings, now: number, rev?: number) =>
	db
		.prepare(
			`INSERT INTO consent_versions (site, rev, created_at, texts_json, cookies_json) SELECT key, ${rev === undefined ? 'rev' : '?'}, ?, ?, ? FROM sites WHERE key = ? ON CONFLICT (site, rev) DO NOTHING`
		)
		.bind(
			...(rev === undefined ? [] : [rev]),
			now,
			JSON.stringify({ texts: s.texts, preferencesCategory: s.preferencesCategory }),
			JSON.stringify(s.cookies),
			key
		);

/**
 * Saves settings. Raises the revision (and snapshots it) when wording, the cookie list or the
 * Preferences category changed, or when `askAgain` is set. Returns whether it was raised.
 */
export async function saveSettings(
	db: Db,
	site: SiteRow,
	next: SiteSettings,
	opts: { askAgain?: boolean; now?: number } = {}
): Promise<{ bumped: boolean }> {
	const now = opts.now ?? Date.now();
	const prev = siteSettings(site);
	const value = parseSettings(next);
	const bumped = !!opts.askAgain || askedAgainKey(prev) !== askedAgainKey(value);
	const update = db
		.prepare(
			`UPDATE sites SET settings_json = ?, updated_at = ?${bumped ? ', rev = rev + 1' : ''} WHERE key = ?`
		)
		.bind(JSON.stringify(value), now, site.key);
	if (!bumped) await update.run();
	// Keep what earlier visitors saw (if not kept yet), then the new revision, in one transaction.
	else await db.batch([snapshotStmt(db, site.key, prev, now, site.rev), update, snapshotStmt(db, site.key, value, now)]);
	return { bumped };
}

export interface VersionRow {
	rev: number;
	created_at: number;
	texts_json: string;
	cookies_json: string;
}
export async function listVersions(db: Db, key: string): Promise<VersionRow[]> {
	return (
		await db
			.prepare('SELECT rev, created_at, texts_json, cookies_json FROM consent_versions WHERE site = ? ORDER BY rev DESC LIMIT 50')
			.bind(key)
			.all<VersionRow>()
	).results;
}
