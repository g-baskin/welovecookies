import { fail, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { readSession } from '#lib/server/auth.ts';
import { consentRequestState } from '#lib/server/consent/state.ts';
import { consentFor } from '#lib/server/ads/attribution.ts';
import { getConsentSettings, withCookieLabels } from '#lib/server/consent/settings.ts';
import { MODE_RULES } from '#lib/consent/regions.ts';
import { getDb, schema } from '#lib/server/db/index.ts';
import {
	createPrivacyRequest,
	dueDaysFor,
	notifyPrivacyRequest,
	requestFormSchema
} from '#lib/server/privacy/requests.ts';
import type { Actions, PageServerLoad } from './$types';

/** hooks.server.ts reads the shopper's session only on /account pages, so read it here the way the
 * store layout does; otherwise a signed-in shopper's request is never linked to their account. */
async function signedInCustomerId(
	event: Pick<RequestEvent, 'locals' | 'cookies'>
): Promise<string | null> {
	return event.locals?.customerId ?? (await readSession(event.cookies, 'customer'));
}

async function customerEmail(customerId: string | null | undefined): Promise<string | null> {
	if (!customerId) return null;
	const row = await getDb()
		.select({ email: schema.customers.email })
		.from(schema.customers)
		.where(eq(schema.customers.id, customerId))
		.get();
	return row?.email ?? null;
}

export const load: PageServerLoad = async (event) => {
	const settings = await getConsentSettings();
	const state = await consentRequestState(event, { settings });
	const rule = MODE_RULES[state.mode];
	// Ads view of the same choice (region optin/optout, consent granted/denied/...), kept for callers.
	const ads = await consentFor(event);
	return {
		region: ads.region,
		consent: ads.consent,
		optIn: rule.optIn,
		doNotSell: rule.doNotSellLink,
		gpc: state.gpc,
		grants: state.grants,
		chosen: !!state.stored,
		consentId: state.stored && !state.legacy ? state.stored.id : null,
		chosenAt: state.stored && !state.legacy ? state.stored.at : null,
		preferencesCategory: settings.preferencesCategory,
		cookies: withCookieLabels(settings.cookies),
		signedInEmail: await signedInCustomerId(event)
			.then(customerEmail)
			.catch(() => null),
		replyDays: dueDaysFor(state.country)
	};
};

export const actions: Actions = {
	request: async (event) => {
		const f = await event.request.formData();
		const str = (k: string) => String(f.get(k) ?? '');
		const values = {
			kind: str('kind'),
			email: str('email').trim(),
			name: str('name'),
			message: str('message')
		};
		const state = await consentRequestState(event);
		const days = dueDaysFor(state.country);
		const customerId = await signedInCustomerId(event).catch(() => null);
		const signedIn = await customerEmail(customerId).catch(() => null);
		// Honeypot: bots fill the hidden field. Pretend it worked and keep nothing.
		if (str('website').trim()) return { requestSent: { email: values.email, days } };
		const parsed = requestFormSchema.safeParse({ ...values, email: signedIn ?? values.email });
		if (!parsed.success)
			return fail(400, {
				requestError: parsed.error.issues[0]?.message ?? 'Please check the form and try again.',
				values
			});
		const res = await createPrivacyRequest({
			...parsed.data,
			customerId: signedIn ? customerId : null,
			consentId: state.stored && !state.legacy && state.stored.id ? state.stored.id : null,
			country: state.country,
			regionCode: state.regionCode
		});
		if (!res.ok) return fail(429, { requestError: res.error, values });
		await notifyPrivacyRequest(
			{ id: res.id, kind: parsed.data.kind, email: parsed.data.email, dueDays: res.dueDays },
			event.url.origin
		).catch(() => {});
		return { requestSent: { email: parsed.data.email, days: res.dueDays } };
	}
};
