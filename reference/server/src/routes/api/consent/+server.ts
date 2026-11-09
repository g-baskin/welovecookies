/**
 * We Love Cookies: the shopper's cookie choice. POST from the banner (JSON ConsentRecordPayload) or the
 * Your privacy choices page (legacy `{choice: accept|decline|optout|optin}` as a form or JSON).
 * Same-origin, or JSON from another website using the banner (its key in `site`, its exact
 * origin, CORS without credentials, no cookie ever set). The server decides the region mode; Global Privacy Control turns marketing off.
 * Works without JavaScript (form posts redirect back).
 */
import { json, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { recordChoice, type ChoiceInput } from '#lib/server/consent/record.ts';
import { consentRequestState } from '#lib/server/consent/state.ts';
import {
	ALL_GRANTED,
	CONSENT_ACTIONS,
	CONSENT_MODES,
	DEVICES,
	NONE_GRANTED
} from '#lib/consent/types.ts';
import type { ConsentRecordResponse } from '#lib/consent/types.ts';
import {
	corsHeaders,
	enabledSiteByOrigin,
	preflightHeaders,
	siteForRequest
} from '#lib/server/consent/sites.ts';
import type { RequestHandler } from './$types';

const payloadSchema = z.object({
	id: z.string().max(40),
	action: z.enum(CONSENT_ACTIONS),
	grants: z.object({ preferences: z.boolean(), analytics: z.boolean(), marketing: z.boolean() }),
	mode: z.enum(CONSENT_MODES), // informational only: never trusted
	rev: z.number().int().min(0),
	lang: z.string().regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})?$/),
	device: z.enum(DEVICES),
	gpc: z.boolean(),
	page: z.string().max(500),
	landing: z.string().max(2000).optional(),
	site: z.string().max(40).optional()
});

const LEGACY = ['accept', 'decline', 'optout', 'optin'] as const;
type Legacy = (typeof LEGACY)[number];

/** Path only, same origin. */
function pathOf(raw: unknown, origin: string): { path: string; url: URL | null } {
	if (typeof raw !== 'string' || !raw) return { path: '', url: null };
	try {
		const u = new URL(raw, origin);
		if (u.origin !== origin) return { path: '', url: null };
		return { path: u.pathname.slice(0, 200), url: u };
	} catch {
		return { path: '', url: null };
	}
}

export const POST: RequestHandler = async (event) => {
	const { request, url } = event;
	const origin = request.headers.get('origin');
	const isForm = (request.headers.get('content-type') ?? '').includes('form');
	if (origin !== url.origin && isForm) return json({ error: 'Not allowed.' }, { status: 403 });
	const body: Record<string, unknown> = isForm
		? Object.fromEntries(await request.formData())
		: (((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>);

	if (origin !== url.origin) {
		// Another website using the banner.
		const found = await siteForRequest(body.site, origin);
		if (!found.ok) return json({ error: 'Not allowed.' }, { status: 403 });
		const headers = corsHeaders(found.site.origin);
		const parsed = payloadSchema.safeParse(body);
		if (!parsed.success)
			return json({ error: 'Choose accept or decline.' }, { status: 400, headers });
		const p = parsed.data;
		const consent = await recordChoice(event, {
			id: p.id,
			action: p.action,
			grants: p.grants,
			lang: p.lang.toLowerCase(),
			device: p.device,
			page: pathOf(p.page, found.site.origin).path,
			site: found.site.id
		});
		return json({ ok: true, consent } satisfies ConsentRecordResponse, { headers });
	}

	if (typeof body.choice === 'string') {
		const choice = (LEGACY as readonly string[]).includes(body.choice)
			? (body.choice as Legacy)
			: null;
		if (!choice) return json({ error: 'Choose accept or decline.' }, { status: 400 });
		const landing = pathOf(body.landing, url.origin);
		const input: ChoiceInput = {
			action: 'accept_all',
			grants: { ...ALL_GRANTED },
			lang: '',
			page: '/privacy-choices',
			landing: landing.url
		};
		if (choice === 'decline')
			Object.assign(input, { action: 'reject_all', grants: { ...NONE_GRANTED } });
		if (choice === 'optout') {
			const now = await consentRequestState(event).catch(() => null);
			input.action = 'custom';
			input.grants = { ...(now?.grants ?? ALL_GRANTED), marketing: false };
		}
		// Privacy page choices (also without JavaScript): the server writes wlc_consent host-only.
		const consent = await recordChoice(event, { ...input, setCookie: true });
		const value = consent.grants.marketing ? 'granted' : choice === 'decline' ? 'denied' : 'optout';
		if (isForm) {
			const back = landing.url ? `${landing.url.pathname}${landing.url.search}` : '/';
			redirect(303, back.startsWith('/') && !back.startsWith('//') ? back : '/');
		}
		return json({ ok: true, choice: value, consent });
	}

	const parsed = payloadSchema.safeParse(body);
	if (!parsed.success) return json({ error: 'Choose accept or decline.' }, { status: 400 });
	const p = parsed.data;
	const consent = await recordChoice(event, {
		id: p.id,
		action: p.action,
		grants: p.grants,
		lang: p.lang.toLowerCase(),
		device: p.device,
		page: pathOf(p.page, url.origin).path,
		landing: pathOf(p.landing ?? p.page, url.origin).url
	});
	return json({ ok: true, consent } satisfies ConsentRecordResponse);
};

export const OPTIONS: RequestHandler = async ({ request }) => {
	const site = await enabledSiteByOrigin(request.headers.get('origin'));
	if (!site) return new Response(null, { status: 403 });
	return new Response(null, { status: 204, headers: preflightHeaders(site.origin, 'POST') });
};
