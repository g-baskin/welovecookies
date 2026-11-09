import { describe, expect, it } from 'vitest';
import { handleConfig, handlePreflight, placeOf } from './config.ts';
import { handlePrivacy } from './privacy.ts';
import { handleRecord, handleSeen, pathOnly } from './record.ts';
import { addTestSite, TEST_KEY, TEST_ORIGIN, testDb } from './test-d1.ts';

const W = 'https://admin.example.net';
const now = Date.UTC(2026, 10, 9, 12);
const withCf = (r: Request, cf?: object) => Object.assign(r, cf ? { cf } : {});
const setup = (o: Parameters<typeof addTestSite>[1] = {}) => {
	const db = testDb();
	addTestSite(db, o);
	return { db, env: { DB: db } };
};
const choice = (over: object = {}) => ({
	id: 'k3J9x_aB2cD4eF6g', action: 'accept_all', grants: { preferences: true, analytics: true, marketing: true },
	mode: 'notice', rev: 0, lang: 'de-DE', device: 'phone', gpc: false, page: '/pricing?utm=x', site: TEST_KEY, ...over
}); // prettier-ignore
const post = (path: string, body: unknown, headers: Record<string, string> = {}, cf?: object) =>
	withCf(
		new Request(`${W}${path}`, {
			method: 'POST',
			headers: {
				origin: TEST_ORIGIN,
				'content-type': 'application/json',
				'user-agent': 'Mozilla/5.0 Test',
				...headers
			},
			body: typeof body === 'string' ? body : JSON.stringify(body)
		}),
		cf
	);

describe('GET /api/consent/config', () => {
	const get = (origin: string | null, cf?: object, key = TEST_KEY) =>
		withCf(
			new Request(`${W}/api/consent/config?site=${key}`, { headers: origin ? { origin } : {} }),
			cf
		);

	it('answers the site’s exact origin with the server-side region mode', async () => {
		const { env } = setup();
		const r = await handleConfig(get(TEST_ORIGIN, { country: 'US', regionCode: 'CA' }), env);
		expect(r.status).toBe(200);
		expect(r.headers.get('access-control-allow-origin')).toBe(TEST_ORIGIN);
		expect(r.headers.get('cache-control')).toContain('no-store');
		const c = await r.json();
		expect(c).toMatchObject({
			mode: 'opt-out-gpc',
			country: 'US',
			region: 'CA',
			rev: 1,
			site: TEST_KEY
		});
		expect(c.endpoints).toEqual({ record: `${W}/api/consent`, seen: `${W}/api/consent/seen` });
		expect(c.links.privacyPolicy).toBe('https://example.com/privacy');
		expect(c.links.privacyChoices).toBe(`${W}/privacy/${TEST_KEY}?kind=stop_selling`);
	});
	it('falls back to opt-in when the location is unknown (no request.cf locally)', async () => {
		const { env } = setup();
		expect((await (await handleConfig(get(TEST_ORIGIN), env)).json()).mode).toBe('opt-in');
		expect((await (await handleConfig(get(TEST_ORIGIN, { country: 'XX' }), env)).json()).mode).toBe(
			'opt-in'
		);
		expect((await (await handleConfig(get(TEST_ORIGIN, { country: 'DE' }), env)).json()).mode).toBe(
			'opt-in'
		);
	});
	it('refuses other origins and unknown sites, without CORS headers', async () => {
		const { env } = setup();
		const bad = await handleConfig(get('https://evil.test'), env);
		expect(bad.status).toBe(403);
		expect(bad.headers.get('access-control-allow-origin')).toBeNull();
		expect((await handleConfig(get(TEST_ORIGIN, undefined, 'ws_unknownkey12'), env)).status).toBe(
			404
		);
	});
	it('answers 404 when the banner is switched off', async () => {
		const { env } = setup({ settings: { enabled: false } });
		expect((await handleConfig(get(TEST_ORIGIN), env)).status).toBe(404);
	});
	it('preflights only an enabled site’s origin', async () => {
		const { env } = setup();
		const opt = (origin: string) =>
			new Request(`${W}/api/consent`, { method: 'OPTIONS', headers: { origin } });
		const ok = await handlePreflight(opt(TEST_ORIGIN), env, 'POST');
		expect(ok.status).toBe(204);
		expect(ok.headers.get('access-control-allow-methods')).toBe('POST');
		expect((await handlePreflight(opt('https://evil.test'), env, 'POST')).status).toBe(403);
	});
});

describe('POST /api/consent', () => {
	it('saves the choice with the server’s mode and revision, path only, clipped user agent', async () => {
		const { db, env } = setup();
		const ua = `Mozilla/5.0 ${'x'.repeat(400)}`;
		const r = await handleRecord(
			post('/api/consent', choice(), { 'user-agent': ua }, { country: 'FR' }),
			env,
			now
		);
		expect(r.status).toBe(200);
		expect(r.headers.get('access-control-allow-origin')).toBe(TEST_ORIGIN);
		const { consent } = await r.json();
		expect(consent).toMatchObject({
			id: 'k3J9x_aB2cD4eF6g',
			mode: 'opt-in',
			rev: 1,
			at: now,
			action: 'accept_all'
		});
		const row = db.sql.prepare('SELECT * FROM consent_records').get() as Record<string, unknown>;
		expect(row).toMatchObject({
			site: TEST_KEY,
			mode: 'opt-in',
			country: 'FR',
			page: '/pricing',
			lang: 'de-de',
			device: 'phone',
			marketing: 1
		});
		expect(String(row.user_agent).length).toBe(200);
		expect(Object.keys(row)).not.toContain('ip');
		const daily = db.sql.prepare('SELECT metric, count FROM consent_daily').all();
		expect(daily).toEqual([{ metric: 'accept_all', count: 1 }]);
	});
	it('turns marketing off for GPC from the payload or the Sec-GPC header', async () => {
		for (const [over, headers] of [
			[{ gpc: true }, {}],
			[{}, { 'sec-gpc': '1' }]
		] as const) {
			const { db, env } = setup();
			const r = await handleRecord(
				post('/api/consent', choice(over), headers, { country: 'US', regionCode: 'CO' }),
				env,
				now
			);
			const { consent } = await r.json();
			expect(consent.grants).toEqual({ preferences: true, analytics: true, marketing: false });
			expect(consent.mode).toBe('opt-out-gpc');
			const metrics = db.sql
				.prepare('SELECT metric FROM consent_daily ORDER BY metric')
				.all()
				.map((m) => (m as { metric: string }).metric);
			expect(metrics).toEqual(['accept_all', 'gpc']);
		}
	});
	it('replaces a malformed consent id and rejects malformed choices', async () => {
		const { env } = setup();
		const ok = await (
			await handleRecord(post('/api/consent', choice({ id: '<script>' })), env, now)
		).json();
		expect(ok.consent.id).toMatch(/^[A-Za-z0-9_-]{16}$/);
		for (const bad of [
			choice({ action: 'maybe' }),
			choice({ grants: { preferences: 1 } }),
			choice({ device: 'tv' }),
			choice({ lang: 'x' }),
			choice({ page: 'x'.repeat(600) })
		]) {
			const r = await handleRecord(post('/api/consent', bad), env, now);
			expect(r.status).toBe(400);
		}
		expect((await handleRecord(post('/api/consent', 'not json'), env, now)).status).toBe(404);
		expect((await handleRecord(post('/api/consent', 'x'.repeat(9000)), env, now)).status).toBe(404);
	});
	it('refuses a wrong origin and a switched-off site', async () => {
		const { db, env } = setup();
		expect(
			(
				await handleRecord(
					post('/api/consent', choice(), { origin: 'https://evil.test' }),
					env,
					now
				)
			).status
		).toBe(403);
		db.sql.prepare('UPDATE sites SET enabled = 0').run();
		expect((await handleRecord(post('/api/consent', choice()), env, now)).status).toBe(404);
		expect(db.sql.prepare('SELECT count(*) AS n FROM consent_records').get()).toEqual({ n: 0 });
	});
	it('keeps the record but skips counters for bots', async () => {
		const { db, env } = setup();
		await handleRecord(post('/api/consent', choice(), { 'user-agent': 'Googlebot/2.1' }), env, now);
		expect(db.sql.prepare('SELECT count(*) AS n FROM consent_records').get()).toEqual({ n: 1 });
		expect(db.sql.prepare('SELECT count(*) AS n FROM consent_daily').get()).toEqual({ n: 0 });
	});
	it('keeps only same-origin paths', () => {
		expect(pathOnly('/a?b=1#c', TEST_ORIGIN)).toBe('/a');
		expect(pathOnly('https://evil.test/x', TEST_ORIGIN)).toBe('');
	});
});

describe('POST /api/consent/seen', () => {
	it('counts one cookieless view per call and answers 204 with CORS', async () => {
		const { db, env } = setup();
		const body = { mode: 'opt-in', device: 'desktop', lang: 'en', site: TEST_KEY };
		const r = await handleSeen(post('/api/consent/seen', body, {}, { country: 'GB' }), env, now);
		await handleSeen(post('/api/consent/seen', body, {}, { country: 'GB' }), env, now);
		expect(r.status).toBe(204);
		expect(r.headers.get('access-control-allow-origin')).toBe(TEST_ORIGIN);
		expect(db.sql.prepare('SELECT metric, mode, country, count FROM consent_daily').all()).toEqual([
			{ metric: 'seen', mode: 'opt-in-uk', country: 'GB', count: 2 }
		]);
		expect(
			(await handleSeen(post('/api/consent/seen', body, { origin: 'https://evil.test' }), env, now))
				.status
		).toBe(403);
		expect(
			(await handleSeen(post('/api/consent/seen', { ...body, device: 'tv' }), env, now)).status
		).toBe(400);
	});
});

describe('hosted privacy request form', () => {
	const form = (fields: Record<string, string>, origin = W, cf?: object) =>
		withCf(
			new Request(`${W}/privacy/${TEST_KEY}`, {
				method: 'POST',
				headers: { origin, 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams(fields)
			}),
			cf
		);
	const good = {
		kind: 'delete',
		email: ' Ann@Example.com ',
		name: 'Ann',
		message: 'Hi',
		website: ''
	};
	const count = (db: ReturnType<typeof testDb>) =>
		(db.sql.prepare('SELECT count(*) AS n FROM privacy_requests').get() as { n: number }).n;

	it('shows the form with a notice, escaped site name and preselected kind', async () => {
		const { db, env } = setup();
		db.sql.prepare("UPDATE sites SET name = '<b>Evil</b>'").run();
		const r = await handlePrivacy(
			new Request(`${W}/privacy/${TEST_KEY}?kind=stop_selling`),
			env,
			TEST_KEY
		);
		const body = await r.text();
		expect(r.status).toBe(200);
		expect(body).toContain('&lt;b&gt;Evil&lt;/b&gt;');
		expect(body).not.toContain('<b>Evil</b>');
		expect(body).toMatch(/value="stop_selling" required checked/);
		expect(body).toContain('only to answer this request');
		expect(r.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
	});
	it('saves a valid request with the due date for the visitor’s country', async () => {
		const { db, env } = setup();
		const r = await handlePrivacy(form(good, W, { country: 'BR' }), env, TEST_KEY, now);
		expect(r.status).toBe(200);
		expect(await r.text()).toContain('within 15 days');
		const row = db.sql.prepare('SELECT * FROM privacy_requests').get() as Record<string, unknown>;
		expect(row).toMatchObject({
			email: 'ann@example.com',
			kind: 'delete',
			status: 'new',
			country: 'BR',
			due_at: now + 15 * 86_400_000
		});
	});
	it('drops honeypot posts, cross-site posts and invalid input', async () => {
		const { db, env } = setup();
		expect(
			(await handlePrivacy(form({ ...good, website: 'spam' }), env, TEST_KEY, now)).status
		).toBe(200);
		expect((await handlePrivacy(form(good, 'https://evil.test'), env, TEST_KEY, now)).status).toBe(
			403
		);
		expect((await handlePrivacy(form({ ...good, email: 'nope' }), env, TEST_KEY, now)).status).toBe(
			400
		);
		expect((await handlePrivacy(form({ ...good, kind: 'other' }), env, TEST_KEY, now)).status).toBe(
			400
		);
		expect(count(db)).toBe(0);
	});
	it('limits requests per email per day', async () => {
		const { db, env } = setup();
		for (let i = 0; i < 3; i++)
			expect((await handlePrivacy(form(good), env, TEST_KEY, now + i)).status).toBe(200);
		expect((await handlePrivacy(form(good), env, TEST_KEY, now + 10)).status).toBe(429);
		expect(count(db)).toBe(3);
	});
	it('is not available for unknown or switched-off sites', async () => {
		const { env } = setup({ enabled: 0 });
		expect(
			(await handlePrivacy(new Request(`${W}/privacy/${TEST_KEY}`), env, TEST_KEY)).status
		).toBe(404);
	});
});

describe('placeOf', () => {
	it('reads only well-formed codes', () => {
		expect(placeOf(withCf(new Request(W), { country: 'us', regionCode: 'ca' }))).toEqual({
			country: 'US',
			regionCode: 'CA'
		});
		expect(placeOf(withCf(new Request(W), { country: 'T1', regionCode: '<x>' }))).toEqual({
			country: null,
			regionCode: null
		});
		expect(placeOf(new Request(W))).toEqual({ country: null, regionCode: null });
	});
});
