/**
 * Saving a shopper's cookie choice: the server decides the region mode (never the client), Global
 * Privacy Control turns marketing off, the choice goes into eb_cc and the proof-of-consent log.
 * Logging never breaks the shopper's page: failures are logged and the choice still saved.
 */
import type { Cookies } from '@sveltejs/kit';
import { shouldCount } from '#lib/server/analytics.ts';
import { readSession } from '#lib/server/auth.ts';
import { ATTR_COOKIE, captureLanding, type VisitEvent } from '#lib/server/ads/attribution.ts';
import { MODE_RULES } from '#lib/consent/regions.ts';
import type { ConsentAction, Device, Grants, StoredConsent } from '#lib/consent/types.ts';
import { consentRequestState } from './state.ts';
import {
	bumpConsentDaily,
	bumpConsentSiteDaily,
	clearLegacyConsentCookie,
	type ConsentMetric,
	deviceOf,
	insertConsentRecord,
	validConsentId,
	writeConsentCookie
} from './log.ts';

export interface ChoiceInput {
	id?: unknown;
	action: ConsentAction;
	grants: Grants;
	lang: string;
	device?: Device;
	/** Path only. */
	page: string;
	/** Same-origin page the shopper landed on (ad tags are kept from it when marketing is allowed). */
	landing?: URL | null;
	/**
	 * Another website's key (hosted install): no cookie is read or written, no ad visit kept,
	 * counters go to consent_site_daily.
	 */
	site?: string;
	/** Also write eb_cc host-only (only the no-JavaScript form path; the banner writes it itself). */
	setCookie?: boolean;
}

export async function recordChoice(
	event: VisitEvent & { cookies: Cookies },
	input: ChoiceInput,
	now = Date.now()
): Promise<StoredConsent> {
	const state = await consentRequestState(event, { now });
	const grants: Grants = state.gpc ? { ...input.grants, marketing: false } : { ...input.grants };
	const consent: StoredConsent = {
		id: validConsentId(input.id ?? state.stored?.id),
		at: now,
		mode: state.mode,
		rev: state.rev,
		grants,
		action: input.action
	};
	const site = input.site ?? '';
	if (site) {
		// Other website: never touch this store's cookies.
	} else if (input.setCookie) writeConsentCookie(event, consent);
	else clearLegacyConsentCookie(event);
	if (site) {
		// No landing capture for other websites.
	} else if (grants.marketing) {
		if (input.landing && input.landing.origin === event.url.origin)
			captureLanding(event, input.landing, now);
	} else if (MODE_RULES[state.mode].optIn) {
		event.cookies.delete(ATTR_COOKIE, { path: '/' });
	}
	const userAgent = event.request.headers.get('user-agent');
	const device = input.device ?? deviceOf(userAgent);
	try {
		const customerId = site ? null : await readSession(event.cookies, 'customer').catch(() => null);
		await insertConsentRecord({
			consent,
			country: state.country,
			regionCode: state.regionCode,
			lang: input.lang,
			device,
			gpc: state.gpc,
			page: input.page,
			userAgent,
			customerId,
			site
		});
		if (shouldCount(event.request, event.cookies)) {
			const bump = (metric: ConsentMetric) =>
				site
					? bumpConsentSiteDaily(site, metric, state.mode, state.country, device, now)
					: bumpConsentDaily(metric, state.mode, state.country, device, now);
			await bump(consent.action);
			if (state.gpc && input.action !== 'gpc') await bump('gpc');
		}
	} catch (err) {
		console.error('consent: could not record the choice', err);
	}
	return consent;
}
