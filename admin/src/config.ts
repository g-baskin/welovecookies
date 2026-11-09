// GET /api/consent/config?site=<key>: the ConsentConfig for one visitor of a connected website.
// The region mode comes from Cloudflare's view of the visitor's connection (request.cf), using the
// same table as everything else (regions.ts). Missing location = opt-in (ADR 0002).
import { modeFor } from '../../src/lib/consent/regions.ts';
import { CONSENT_COOKIE_NAME, type ConsentConfig } from '../../src/lib/consent/types.ts';
import { corsHeaders, preflightHeaders, siteForRequest } from './cors.ts';
import { enabledSiteByOrigin, type Env, type SiteRow } from './db.ts';
import { json } from './html.ts';
import { siteSettings, type SiteSettings } from './settings.ts';

export interface Place {
	country: string | null;
	regionCode: string | null;
}

/** Country and region from request.cf (absent in some local setups). */
export function placeOf(request: Request): Place {
	const cf = (request as unknown as { cf?: { country?: unknown; regionCode?: unknown } }).cf;
	const c = typeof cf?.country === 'string' ? cf.country.trim().toUpperCase() : '';
	const r = typeof cf?.regionCode === 'string' ? cf.regionCode.trim().toUpperCase() : '';
	return {
		country: /^[A-Z]{2}$/.test(c) && c !== 'XX' && c !== 'T1' ? c : null,
		regionCode: /^[A-Z0-9]{1,3}$/.test(r) ? r : null
	};
}

export const browserGpc = (request: Request) => request.headers.get('sec-gpc') === '1';

export function buildConfig(
	site: SiteRow,
	s: SiteSettings,
	place: Place,
	gpc: boolean,
	workerOrigin: string
): ConsentConfig {
	return {
		mode: modeFor(place.country, place.regionCode),
		country: place.country,
		region: place.regionCode,
		gpc,
		rev: site.rev,
		texts: s.texts,
		theme: s.theme,
		position: s.position,
		preferencesCategory: s.preferencesCategory,
		floatingButton: s.floatingButton,
		noticeBanner: s.noticeBanner,
		cookies: s.cookies,
		links: {
			...(site.privacy_url ? { privacyPolicy: site.privacy_url } : {}),
			privacyChoices: `${workerOrigin}/privacy/${site.key}?kind=stop_selling`
		},
		endpoints: { record: `${workerOrigin}/api/consent`, seen: `${workerOrigin}/api/consent/seen` },
		cookieName: CONSENT_COOKIE_NAME,
		cookieDomain: 'auto',
		integrations: s.integrations,
		brandName: site.name,
		site: site.key
	};
}

export async function handleConfig(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const found = await siteForRequest(
		env.DB,
		url.searchParams.get('site'),
		request.headers.get('origin')
	);
	if (!found.ok)
		return json(
			{ error: found.status === 404 ? 'Unknown website.' : 'Not allowed.' },
			found.status
		);
	const headers = corsHeaders(found.site.origin);
	const s = siteSettings(found.site);
	// Off: the script falls back to its built-in banner (time-zone guess, no records).
	if (!s.enabled) return json({ error: 'Banner is off.' }, 404, headers);
	return json(
		buildConfig(found.site, s, placeOf(request), browserGpc(request), url.origin),
		200,
		headers
	);
}

/** OPTIONS for the banner endpoints: only an enabled site's exact origin gets an answer. */
export async function handlePreflight(
	request: Request,
	env: Env,
	methods: string
): Promise<Response> {
	const site = await enabledSiteByOrigin(env.DB, request.headers.get('origin'));
	if (!site) return new Response(null, { status: 403 });
	return new Response(null, { status: 204, headers: preflightHeaders(site.origin, methods) });
}
