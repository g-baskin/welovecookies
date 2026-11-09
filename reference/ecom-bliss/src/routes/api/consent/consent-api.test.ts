import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cookieJar } from '#lib/test-support/cookies.ts';
import { createD1TestDb } from '#lib/test-support/d1-db.ts';

const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('#lib/server/db/index.ts', async () => ({
	getDb: () => holder.db,
	schema: await import('#lib/server/db/schema.ts')
}));

import { forgetOptInCountries } from '#lib/server/ads/attribution.ts';
import { decodeConsent } from '#lib/consent/cookie.ts';
import { POST } from './+server.ts';
import { POST as SEEN } from './seen/+server.ts';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15';
let t: ReturnType<typeof createD1TestDb>;
beforeEach(() => {
	t = createD1TestDb();
	holder.db = t.db;
	forgetOptInCountries();
});
afterEach(() => t.close());

function ev(
	path: string,
	body: BodyInit,
	opts: { cf?: Record<string, string>; gpc?: boolean; form?: boolean; origin?: string } = {}
) {
	const jar = cookieJar();
	jar.store.set('eb_consent', 'denied');
	const headers: Record<string, string> = {
		'user-agent': UA,
		origin: opts.origin ?? 'https://shop.test',
		'content-type': opts.form ? 'application/x-www-form-urlencoded' : 'application/json'
	};
	if (opts.gpc) headers['sec-gpc'] = '1';
	const event = {
		url: new URL(`https://shop.test${path}`),
		request: new Request(`https://shop.test${path}`, { method: 'POST', headers, body }),
		cookies: jar.cookies,
		platform: { cf: opts.cf ?? { country: 'DE' } }
	};
	return { event: event as never, jar };
}

const payload = (extra: Record<string, unknown> = {}) =>
	JSON.stringify({
		id: 'abcdefghijklmnop',
		action: 'accept_all',
		grants: { preferences: true, analytics: true, marketing: true },
		mode: 'notice', // the client mode is never trusted
		rev: 1,
		lang: 'de',
		device: 'phone',
		gpc: false,
		page: '/products/ring?x=1',
		...extra
	});

const rows = (table: string) => t.sqlite.prepare(`select * from ${table}`).all();

describe('POST /api/consent', () => {
	it('records the new payload: server mode, log row and counter (the banner writes eb_cc)', async () => {
		const { event, jar } = ev('/api/consent', payload());
		const res = await POST(event);
		const body = await res.json();
		expect(body).toMatchObject({
			ok: true,
			consent: { id: 'abcdefghijklmnop', mode: 'opt-in', action: 'accept_all' }
		});
		expect(jar.store.has('eb_cc')).toBe(false);
		expect(jar.options.has('eb_cc')).toBe(false);
		expect(jar.store.has('eb_consent')).toBe(false);
		const [rec] = rows('consent_records');
		expect(rec).toMatchObject({
			consent_id: 'abcdefghijklmnop',
			mode: 'opt-in',
			country: 'DE',
			marketing: 1,
			device: 'phone',
			page: '/products/ring',
			lang: 'de'
		});
		expect(Object.keys(rec ?? {})).not.toContain('ip');
		expect(rows('consent_daily')).toEqual([
			expect.objectContaining({ metric: 'accept_all', mode: 'opt-in', country: 'DE', count: 1 })
		]);
	});

	it('GPC turns marketing off and gives a fresh id for a bad one', async () => {
		const { event, jar } = ev('/api/consent', payload({ id: 'bad' }), {
			cf: { country: 'US', regionCode: 'CA' },
			gpc: true
		});
		const body = (await (await POST(event)).json()) as { consent: { id: string } };
		expect(body.consent).toMatchObject({
			mode: 'opt-out-gpc',
			grants: { marketing: false, analytics: true }
		});
		expect(body.consent.id).toMatch(/^[A-Za-z0-9_-]{16}$/);
		expect(jar.store.has('eb_cc')).toBe(false);
		expect(
			rows('consent_daily')
				.map((r) => r.metric)
				.sort()
		).toEqual(['accept_all', 'gpc']);
	});

	it('keeps the no-JavaScript form: 303 back to the page', async () => {
		const { event, jar } = ev(
			'/api/consent',
			new URLSearchParams({ choice: 'decline', landing: '/privacy-choices' }),
			{ form: true }
		);
		await expect(POST(event)).rejects.toMatchObject({ status: 303, location: '/privacy-choices' });
		expect(decodeConsent(jar.store.get('eb_cc'))).toMatchObject({
			action: 'reject_all',
			grants: { marketing: false }
		});
		expect(jar.options.get('eb_cc')).toMatchObject({ path: '/', httpOnly: false, secure: true });
		expect(jar.options.get('eb_cc')).not.toHaveProperty('domain');
		expect(rows('consent_records')).toHaveLength(1);
	});

	it('rejects other sites and junk', async () => {
		expect(
			(await POST(ev('/api/consent', payload(), { origin: 'https://evil.test' }).event)).status
		).toBe(403);
		expect((await POST(ev('/api/consent', '{"action":"nope"}').event)).status).toBe(400);
	});
});

describe('POST /api/consent/seen', () => {
	it('counts a view without cookies or personal data', async () => {
		const { event, jar } = ev(
			'/api/consent/seen',
			JSON.stringify({ mode: 'opt-in', device: 'desktop', lang: 'en' })
		);
		const res = await SEEN(event);
		expect(res.status).toBe(204);
		expect(jar.options.size).toBe(0);
		expect(rows('consent_daily')).toEqual([
			expect.objectContaining({ metric: 'seen', device: 'desktop', count: 1 })
		]);
		expect(rows('consent_records')).toHaveLength(0);
	});
});
