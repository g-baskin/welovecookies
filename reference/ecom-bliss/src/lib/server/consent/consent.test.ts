import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cookieJar } from '#lib/test-support/cookies.ts';
import { createD1TestDb } from '#lib/test-support/d1-db.ts';

const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('#lib/server/db/index.ts', async () => ({
	getDb: () => holder.db,
	schema: await import('#lib/server/db/schema.ts')
}));

import { forgetOptInCountries } from '#lib/server/ads/attribution.ts';
import { encodeConsent } from '#lib/consent/cookie.ts';
import { consentRequestState } from './state.ts';
import {
	DEFAULT_COOKIES,
	getConsentSettings,
	saveConsentSettings,
	withCookieLabels
} from './settings.ts';

const NOW = Date.parse('2026-11-03T12:00:00Z');
let t: ReturnType<typeof createD1TestDb>;
beforeEach(() => {
	t = createD1TestDb();
	holder.db = t.db;
	forgetOptInCountries();
});
afterEach(() => t.close());

function ev(
	cf: Record<string, string> | null,
	opts: { gpc?: boolean; cookies?: Record<string, string> } = {}
) {
	const jar = cookieJar();
	for (const [k, v] of Object.entries(opts.cookies ?? {})) jar.store.set(k, v);
	const headers: Record<string, string> = {};
	if (opts.gpc) headers['sec-gpc'] = '1';
	return {
		request: new Request('https://shop.test/', { headers }),
		cookies: jar.cookies,
		platform: cf ? { cf } : {}
	};
}

describe('consent request state', () => {
	it('picks the mode by country and region', async () => {
		const mode = async (cf: Record<string, string> | null) =>
			(await consentRequestState(ev(cf), { now: NOW })).mode;
		expect(await mode({ country: 'DE' })).toBe('opt-in');
		expect(await mode({ country: 'US', regionCode: 'CA' })).toBe('opt-out-gpc');
		expect(await mode({ country: 'US', regionCode: 'NY' })).toBe('notice');
		expect(await mode({ country: 'CA', regionCode: 'QC' })).toBe('opt-in');
		expect(await mode({ country: 'CA', regionCode: 'ON' })).toBe('opt-out');
		expect(await mode(null)).toBe('opt-in');
	});

	it('shows the full banner first in the EU, nothing allowed; notice in California', async () => {
		const de = await consentRequestState(ev({ country: 'DE' }), { now: NOW });
		expect(de).toMatchObject({ banner: 'full', stored: null });
		expect(de.grants).toEqual({ preferences: false, analytics: false, marketing: false });
		const ca = await consentRequestState(ev({ country: 'US', regionCode: 'CA' }), { now: NOW });
		expect(ca).toMatchObject({ banner: 'notice', grants: { marketing: true } });
	});

	it('reads the old eb_consent cookie and GPC', async () => {
		const g = await consentRequestState(
			ev({ country: 'FR' }, { cookies: { eb_consent: 'granted' } }),
			{ now: NOW }
		);
		expect(g).toMatchObject({
			legacy: true,
			banner: null,
			grants: { analytics: true, marketing: true }
		});
		const d = await consentRequestState(
			ev({ country: 'FR' }, { cookies: { eb_consent: 'denied' } }),
			{ now: NOW }
		);
		expect(d.grants.analytics).toBe(false);
		const o = await consentRequestState(
			ev({ country: 'US', regionCode: 'TX' }, { cookies: { eb_consent: 'optout' } }),
			{ now: NOW }
		);
		expect(o.grants).toMatchObject({ analytics: true, marketing: false });
		const gpc = await consentRequestState(ev({ country: 'US', regionCode: 'CA' }, { gpc: true }), {
			now: NOW
		});
		expect(gpc).toMatchObject({ gpc: true, grants: { analytics: true, marketing: false } });
	});

	it('reads eb_cc and asks again after the owner bumps the revision', async () => {
		const cookie = encodeConsent({
			id: 'abcdefghijklmnop',
			at: NOW - 1000,
			mode: 'opt-in',
			rev: 1,
			action: 'accept_all',
			grants: { preferences: true, analytics: true, marketing: true }
		});
		const s = await consentRequestState(ev({ country: 'DE' }, { cookies: { eb_cc: cookie } }), {
			now: NOW
		});
		expect(s).toMatchObject({ banner: null, grants: { marketing: true } });
		await saveConsentSettings(await getConsentSettings(), { askAgain: true, now: NOW });
		const again = await consentRequestState(ev({ country: 'DE' }, { cookies: { eb_cc: cookie } }), {
			now: NOW
		});
		expect(again).toMatchObject({ rev: 2, banner: 'full', grants: { marketing: false } });
	});
});

describe('newest choice cookie', () => {
	it('uses the newest eb_cc when the browser sends several', async () => {
		const c = (at: number, marketing: boolean) =>
			encodeConsent({
				id: 'abcdefghijklmnop',
				at,
				mode: 'opt-in',
				rev: 1,
				action: marketing ? 'accept_all' : 'reject_all',
				grants: { preferences: marketing, analytics: marketing, marketing }
			});
		const jar = cookieJar();
		const s = await consentRequestState(
			{
				request: new Request('https://shop.test/', {
					headers: { cookie: `eb_cc=${c(NOW - 5000, true)}; a=1; eb_cc=${c(NOW - 1000, false)}` }
				}),
				cookies: jar.cookies,
				platform: { cf: { country: 'DE' } }
			},
			{ now: NOW }
		);
		expect(s.stored?.action).toBe('reject_all');
		expect(s.grants.marketing).toBe(false);
	});
});

describe('consent settings', () => {
	it('bumps the revision and keeps a snapshot when wording changes, not for layout', async () => {
		const s = await getConsentSettings();
		expect(s.rev).toBe(1);
		const moved = await saveConsentSettings({ ...s, position: 'bottom-right' }, { now: NOW });
		expect(moved.ok && moved.settings.rev).toBe(1);
		const worded = await saveConsentSettings(
			{ ...s, texts: { en: { title: 'Cookies?' } } },
			{ now: NOW }
		);
		expect(worded.ok && worded.settings.rev).toBe(2);
		const versions = t.sqlite
			.prepare('select rev, texts_json from consent_versions order by rev')
			.all();
		expect(versions.map((v) => v.rev)).toEqual([1, 2]);
		expect(String(versions[1]?.texts_json)).toContain('Cookies?');
		expect((await getConsentSettings()).texts.en?.title).toBe('Cookies?');
	});
});

describe('cookie plain-words names', () => {
	it('every default cookie has a plain-words name', () => {
		for (const c of DEFAULT_COOKIES) expect(c.label?.trim()).toBeTruthy();
	});
	it('rows saved before labels existed get the default name; unknown rows keep just the cookie name', () => {
		const old = [
			{
				name: 'eb_cart',
				provider: 'This store',
				category: 'necessary' as const,
				purpose: 'Bag.',
				duration: '30 days'
			},
			{
				name: 'my_cookie',
				provider: 'Me',
				category: 'necessary' as const,
				purpose: 'Mine.',
				duration: '1 day'
			},
			{
				name: 'eb_cc',
				label: 'Cookie choice',
				provider: 'This store',
				category: 'necessary' as const,
				purpose: 'Choice.',
				duration: '1 year'
			}
		];
		expect(withCookieLabels(old).map((c) => c.label)).toEqual([
			'Your shopping bag',
			undefined,
			'Cookie choice'
		]);
	});
	it('changing only a plain-words name does not ask visitors again', async () => {
		const s = await getConsentSettings();
		const renamed = s.cookies.map((c, i) => (i === 0 ? { ...c, label: 'Cookie choice' } : c));
		const r = await saveConsentSettings({ ...s, cookies: renamed }, { now: NOW });
		expect(r.ok && r.settings.rev).toBe(1);
		expect(r.ok && r.settings.cookies[0]?.label).toBe('Cookie choice');
		const reworded = renamed.map((c, i) => (i === 0 ? { ...c, purpose: 'Something new.' } : c));
		const r2 = await saveConsentSettings({ ...s, cookies: reworded }, { now: NOW });
		expect(r2.ok && r2.settings.rev).toBe(2);
	});
});
