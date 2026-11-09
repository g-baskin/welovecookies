// Cross-origin rules for the banner endpoints: one exact origin per site, never credentials.
import { getSite, type Db, type SiteRow } from './db.ts';

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

/** The enabled site for this key, only when the request comes from its own exact origin. */
export async function siteForRequest(
	db: Db,
	key: unknown,
	origin: string | null
): Promise<{ ok: true; site: SiteRow } | { ok: false; status: 403 | 404 }> {
	const site = await getSite(db, key);
	if (!site || !site.enabled) return { ok: false, status: 404 };
	if (!origin || origin !== site.origin) return { ok: false, status: 403 };
	return { ok: true, site };
}
