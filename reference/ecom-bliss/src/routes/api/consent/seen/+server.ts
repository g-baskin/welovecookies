/**
 * Ecom Cookie: "the banner was shown" beacon. Cookieless daily count only (mode, country, device);
 * no cookie is read for identity or written, nothing personal is stored. Always answers 204.
 * Other websites using the banner send their key in `site` from their own origin (CORS, no
 * credentials); their counts go to consent_site_daily.
 */
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { shouldCount } from '#lib/server/analytics.ts';
import { bumpConsentDaily, bumpConsentSiteDaily } from '#lib/server/consent/log.ts';
import { consentRequestState } from '#lib/server/consent/state.ts';
import {
	corsHeaders,
	enabledSiteByOrigin,
	preflightHeaders,
	siteForRequest
} from '#lib/server/consent/sites.ts';
import { CONSENT_MODES, DEVICES } from '#lib/consent/types.ts';
import type { RequestHandler } from './$types';

const seenSchema = z.object({
	mode: z.enum(CONSENT_MODES),
	device: z.enum(DEVICES),
	lang: z.string().max(12),
	site: z.string().max(40).optional()
});

export const POST: RequestHandler = async (event) => {
	const { request, url } = event;
	const origin = request.headers.get('origin');
	const body: unknown = await request.json().catch(() => null);
	let site = '';
	let headers: Record<string, string> = {};
	if (origin !== url.origin) {
		const key = body && typeof body === 'object' ? (body as { site?: unknown }).site : undefined;
		const found = await siteForRequest(key, origin);
		if (!found.ok) return json({ error: 'Not allowed.' }, { status: 403 });
		site = found.site.id;
		headers = corsHeaders(found.site.origin);
	}
	const parsed = seenSchema.safeParse(body);
	if (!parsed.success) return new Response(null, { status: 400, headers });
	try {
		if (shouldCount(request, event.cookies)) {
			const state = await consentRequestState(event);
			if (site)
				await bumpConsentSiteDaily(site, 'seen', state.mode, state.country, parsed.data.device);
			else await bumpConsentDaily('seen', state.mode, state.country, parsed.data.device);
		}
	} catch (err) {
		console.error('consent: could not count a banner view', err);
	}
	return new Response(null, { status: 204, headers });
};

export const OPTIONS: RequestHandler = async ({ request }) => {
	const found = await enabledSiteByOrigin(request.headers.get('origin'));
	if (!found) return new Response(null, { status: 403 });
	return new Response(null, { status: 204, headers: preflightHeaders(found.origin, 'POST') });
};
