// Connected websites: site keys, address rules and the install snippet. Websites are switched off,
// never deleted, so their consent records stay for the full retention period.
import { DAY_MS, type Db, type SiteRow } from './db.ts';
import { defaultSettings, snapshotStmt, text } from './settings.ts';

const KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** 'ws_' + 12 random url-safe characters (64 symbols, so no bias from the byte mapping). */
export function newSiteKey(): string {
	let out = 'ws_';
	for (const b of crypto.getRandomValues(new Uint8Array(12))) out += KEY_CHARS[b % 64];
	return out;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * "example.com" or "https://example.com/" -> "https://example.com". Plain http only for
 * localhost and 127.0.0.1 (local testing). Null for anything else.
 */
export function normaliseWebsite(raw: string): string | null {
	const v = raw.trim();
	if (!v || /\s/.test(v) || v.length > 200) return null;
	const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
	let u: URL;
	try {
		u = new URL(withScheme);
	} catch {
		return null;
	}
	if (u.username || u.password || u.search || u.hash || (u.pathname !== '/' && u.pathname !== '')) return null;
	if (LOCAL_HOSTS.has(u.hostname) && (u.protocol === 'http:' || u.protocol === 'https:')) return `${u.protocol}//${u.host}`;
	if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
	if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(u.hostname)) return null;
	return `https://${u.host}`;
}

/** '' (no link) or a full https:// address. */
export function parsePrivacyUrl(raw: unknown): string | null {
	const v = text(raw ?? '', 500);
	if (v === null) return null;
	if (!v) return '';
	try {
		const u = new URL(v);
		return u.protocol === 'https:' && !u.username && !u.password ? u.href : null;
	} catch {
		return null;
	}
}

export interface SiteForm {
	name: string;
	origin: string;
	privacyUrl: string;
}

export function parseSiteForm(f: Record<string, unknown>): { ok: true; value: SiteForm } | { ok: false; error: string } {
	const name = text(f.name, 80, 1);
	if (!name) return { ok: false, error: 'Give the website a name (up to 80 characters).' };
	const origin = normaliseWebsite(String(f.address ?? ''));
	if (!origin) return { ok: false, error: 'Enter just the website address, like example.com or https://www.example.com (no page after it).' };
	const privacyUrl = parsePrivacyUrl(f.privacy);
	if (privacyUrl === null) return { ok: false, error: 'The privacy policy link must be a full web address starting with https://' };
	return { ok: true, value: { name, origin, privacyUrl } };
}

export async function createSite(db: Db, v: SiteForm, now = Date.now()): Promise<{ ok: true; key: string } | { ok: false; error: string }> {
	const taken = await db.prepare('SELECT key FROM sites WHERE origin = ?').bind(v.origin).first();
	if (taken) return { ok: false, error: 'That address is already connected. Each website address can be connected once.' };
	const key = newSiteKey();
	const s = defaultSettings();
	await db.batch([
		db
			.prepare('INSERT INTO sites (key, name, origin, privacy_url, enabled, settings_json, rev, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, 1, ?, ?)')
			.bind(key, v.name, v.origin, v.privacyUrl, JSON.stringify(s), now, now),
		snapshotStmt(db, key, s, now)
	]);
	return { ok: true, key };
}

export async function updateSite(db: Db, key: string, v: { name: string; privacyUrl: string; enabled: boolean }, now = Date.now()) {
	const r = await db
		.prepare('UPDATE sites SET name = ?, privacy_url = ?, enabled = ?, updated_at = ? WHERE key = ?')
		.bind(v.name, v.privacyUrl, v.enabled ? 1 : 0, now, key)
		.run();
	return r.meta.changes === 1;
}

export async function listSitesWithCounts(db: Db, now = Date.now()): Promise<(SiteRow & { records30: number })[]> {
	return (
		await db
			.prepare(
				'SELECT s.*, (SELECT count(*) FROM consent_records r WHERE r.site = s.key AND r.created_at > ?) AS records30 FROM sites s ORDER BY s.created_at, s.key'
			)
			.bind(now - 30 * DAY_MS)
			.all<SiteRow & { records30: number }>()
	).results;
}

export const snippet = (workerOrigin: string, key: string) =>
	`<script src="${workerOrigin}/welovecookies.min.js" data-site="${key}" async></script>`;
