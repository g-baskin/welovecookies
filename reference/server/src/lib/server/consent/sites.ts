/**
 * We Love Cookies on other websites (hosted install): the owner's list of websites, their site keys,
 * address checks and the cross-origin headers the banner endpoints answer with.
 * A site may only load its config and send records from its own exact origin.
 */
import { and, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, schema } from '#lib/server/db/index.ts';
import { cookieInfoSchema } from './settings.ts';
import type { CookieInfo } from '#lib/consent/types.ts';

export type ConsentSite = typeof schema.consentSites.$inferSelect;

const KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const SITE_KEY_RE = /^ws_[A-Za-z0-9_-]{12}$/;

/** 'ws_' + 12 random url-safe characters (64 symbols, so no bias from the byte mapping). */
export function newSiteKey(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(12));
	let out = 'ws_';
	for (const b of bytes) out += KEY_CHARS[b % 64];
	return out;
}

/** "example.com" / "https://example.com/" -> "https://example.com". Null for anything else. */
export function normaliseWebsite(raw: string): string | null {
	const v = raw.trim();
	if (!v || /\s/.test(v)) return null;
	const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
	let u: URL;
	try {
		u = new URL(withScheme);
	} catch {
		return null;
	}
	if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
	if (u.username || u.password || u.search || u.hash) return null;
	if (u.pathname !== '/' && u.pathname !== '') return null;
	if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(u.hostname)) return null;
	return `https://${u.host}`;
}

/** "example.com" for "https://example.com". */
export const plainHost = (origin: string) => origin.replace(/^https?:\/\//, '');

const privacyLink = z
	.string()
	.trim()
	.max(500)
	.refine((v) => {
		if (!v) return true;
		try {
			return new URL(v).protocol === 'https:';
		} catch {
			return false;
		}
	}, 'The privacy policy link must be a full web address starting with https://');

export const newSiteSchema = z.object({
	name: z.string().trim().min(1, 'Give the website a name.').max(80, 'Use a shorter name.'),
	address: z
		.string()
		.trim()
		.transform((v, ctx) => {
			const o = normaliseWebsite(v);
			if (!o) {
				ctx.addIssue({
					code: 'custom',
					message:
						'Enter just the website address, like example.com or https://shop.example.com (no page after it).'
				});
				return z.NEVER;
			}
			return o;
		}),
	privacy: privacyLink
});

export async function getSite(key: string): Promise<ConsentSite | null> {
	if (!SITE_KEY_RE.test(key)) return null;
	const row = await getDb()
		.select()
		.from(schema.consentSites)
		.where(eq(schema.consentSites.id, key))
		.get();
	return row ?? null;
}

/** The enabled site for this key, only when the request comes from its own address. */
export async function siteForRequest(
	key: unknown,
	origin: string | null
): Promise<{ ok: true; site: ConsentSite } | { ok: false; status: 403 | 404 }> {
	const site = typeof key === 'string' ? await getSite(key) : null;
	if (!site || !site.enabled) return { ok: false, status: 404 };
	if (!origin || origin !== site.origin) return { ok: false, status: 403 };
	return { ok: true, site };
}

/** Any enabled site with this exact origin (for preflights, which carry no body). */
export async function enabledSiteByOrigin(origin: string | null): Promise<ConsentSite | null> {
	if (!origin) return null;
	const row = await getDb()
		.select()
		.from(schema.consentSites)
		.where(and(eq(schema.consentSites.origin, origin), eq(schema.consentSites.enabled, 1)))
		.get();
	return row ?? null;
}

/** CORS for one exact origin, never with credentials. */
export const corsHeaders = (origin: string): Record<string, string> => ({
	'access-control-allow-origin': origin,
	vary: 'Origin'
});

export const preflightHeaders = (origin: string, methods: string): Record<string, string> => ({
	...corsHeaders(origin),
	'access-control-allow-methods': methods,
	'access-control-allow-headers': 'content-type',
	'access-control-max-age': '86400'
});

/** The site's own cookie list, else null (use the store's). */
export function siteCookies(site: ConsentSite): CookieInfo[] | null {
	if (!site.cookiesJson) return null;
	try {
		const ok = z.array(cookieInfoSchema).safeParse(JSON.parse(site.cookiesJson));
		return ok.success ? ok.data : null;
	} catch {
		return null;
	}
}

export async function listSites(now = Date.now()) {
	const db = getDb();
	const s = schema.consentSites;
	const r = schema.consentRecords;
	const [sites, counts] = await Promise.all([
		db.select().from(s).orderBy(s.createdAt, s.id).all(),
		db
			.select({ site: r.site, n: sql<number>`count(*)` })
			.from(r)
			.where(and(gte(r.createdAt, now - 30 * 86_400_000), sql`${r.site} <> ''`))
			.groupBy(r.site)
			.all()
	]);
	const n = new Map(counts.map((c) => [c.site, Number(c.n)]));
	return sites.map((x) => ({ ...x, records30: n.get(x.id) ?? 0 }));
}

/** Site key -> website name, for the records table and spreadsheet. */
export async function siteNames(): Promise<Map<string, string>> {
	const rows = await getDb()
		.select({ id: schema.consentSites.id, name: schema.consentSites.name })
		.from(schema.consentSites)
		.all();
	return new Map(rows.map((r) => [r.id, r.name]));
}

/** Plain name of where a record came from. */
export function websiteLabel(site: string, names: Map<string, string>, storeName: string): string {
	if (!site) return storeName;
	return names.get(site) ?? 'Removed website';
}
