/**
 * We Love Cookies hosted install: GET ?site=<key> answers the ConsentConfig for a visitor of another
 * website. CORS only for that site's exact origin, no credentials, never a cookie. The region mode
 * comes from the visitor's connection with the same rules as the store.
 */
import { json } from '@sveltejs/kit';
import { getConsentSettings } from '#lib/server/consent/settings.ts';
import { consentRequestState } from '#lib/server/consent/state.ts';
import {
	corsHeaders,
	enabledSiteByOrigin,
	preflightHeaders,
	siteCookies,
	siteForRequest
} from '#lib/server/consent/sites.ts';
import { CONSENT_COOKIE_NAME, type ConsentConfig } from '#lib/consent/types.ts';
import type { RequestHandler } from './$types';

const NO_STORE = { 'cache-control': 'private, no-store' };
const noCookies = { get: () => undefined };

export const GET: RequestHandler = async (event) => {
	const { url, request } = event;
	const origin = request.headers.get('origin');
	const found = await siteForRequest(url.searchParams.get('site'), origin);
	if (!found.ok)
		return json(
			{ error: found.status === 404 ? 'Unknown website.' : 'Not allowed.' },
			{ status: found.status, headers: NO_STORE }
		);
	const { site } = found;
	const settings = await getConsentSettings();
	const headers = { ...NO_STORE, ...corsHeaders(site.origin) };
	if (!settings.enabled) return json({ error: 'Banner is off.' }, { status: 404, headers });
	const state = await consentRequestState(
		{ request, cookies: noCookies, platform: event.platform },
		{ settings }
	);
	const config: ConsentConfig = {
		mode: state.mode,
		country: state.country,
		region: state.regionCode,
		gpc: state.gpc,
		rev: settings.rev,
		texts: settings.texts,
		position: settings.position,
		preferencesCategory: settings.preferencesCategory,
		floatingButton: settings.floatingButton,
		noticeBanner: settings.noticeBanner,
		cookies: siteCookies(site) ?? settings.cookies,
		links: site.privacyUrl ? { privacyPolicy: site.privacyUrl } : {},
		endpoints: { record: `${url.origin}/api/consent`, seen: `${url.origin}/api/consent/seen` },
		cookieName: CONSENT_COOKIE_NAME,
		cookieDomain: 'auto',
		integrations: settings.integrations,
		site: site.id
	};
	return json(config, { headers });
};

export const OPTIONS: RequestHandler = async ({ request }) => {
	const site = await enabledSiteByOrigin(request.headers.get('origin'));
	if (!site) return new Response(null, { status: 403 });
	return new Response(null, { status: 204, headers: preflightHeaders(site.origin, 'GET') });
};
