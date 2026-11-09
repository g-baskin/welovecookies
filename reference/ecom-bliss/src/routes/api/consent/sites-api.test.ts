import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cookieJar } from '#lib/test-support/cookies.ts';
import { createD1TestDb } from '#lib/test-support/d1-db.ts';

const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('#lib/server/db/index.ts', async () => ({
	getDb: () => holder.db,
	schema: await import('#lib/server/db/schema.ts')
}));

import { forgetOptInCountries } from '#lib/server/ads/attribution.ts';
import { setSetting } from '#lib/server/settings.ts';
import { clientConfigFor } from '#lib/server/consent/state.ts';
import { POST, OPTIONS } from './+server.ts';
import { POST as SEEN, OPTIONS as SEEN_OPTIONS } from './seen/+server.ts';
import { GET as CONFIG, OPTIONS as CONFIG_OPTIONS } from './config/+server.ts';

const KEY = 'ws_abcdefghijkl';
const SITE = 'https://blog.example.com';
let t: ReturnType<typeof createD1TestDb>;
beforeEach(() => {
	t = createD1TestDb();
	holder.db = t.db;
	forgetOptInCountries();
	t.sqlite
		.prepare(
			'insert into consent_sites (id, name, origin, privacy_url, enabled, created_at) values (?, ?, ?, ?, ?, ?)'
		)
		.run(KEY, 'My blog', SITE, 'https://blog.example.com/privacy', 1, 1);
	t.sqlite
		.prepare(
			'insert into consent_sites (id, name, origin, privacy_url, enabled, created_at) values (?, ?, ?, ?, ?, ?)'
		)
		.run('ws_offoffoffoff', 'Old site', 'https://old.example.com', '', 0, 2);
});
afterEach(() => t.close());

function ev(path: string, opts: { method?: string; origin?: string | null; body?: string } = {}) {
	const jar = cookieJar();
	const headers: Record<string, string> = {
		'content-type': 'application/json',
		'user-agent':
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15'
	};
	if (opts.origin !== null) headers.origin = opts.origin ?? SITE;
	const url = new URL(`https://shop.test${path}`);
	return {
		event: {
			url,
			request: new Request(url, { method: opts.method ?? 'POST', headers, body: opts.body }),
			cookies: jar.cookies,
			platform: { cf: { country: 'FR' } }
		} as never,
		jar
	};
}
const rows = (table: string) => t.sqlite.prepare(`select * from ${table}`).all();
const payload = JSON.stringify({
	id: 'abcdefghijklmnop',
	action: 'accept_all',
	grants: { preferences: true, analytics: true, marketing: true },
	mode: 'opt-in',
	rev: 1,
	lang: 'fr',
	device: 'desktop',
	gpc: false,
	page: '/post/1?utm=x',
	site: KEY,
	landing: 'https://blog.example.com/?gclid=1'
});

describe('hosted config', () => {
	it('answers the right origin with absolute endpoints and the site key', async () => {
		const res = await CONFIG(ev(`/api/consent/config?site=${KEY}`, { method: 'GET' }).event);
		expect(res.status).toBe(200);
		expect(res.headers.get('access-control-allow-origin')).toBe(SITE);
		expect(res.headers.get('vary')).toBe('Origin');
		expect(res.headers.get('access-control-allow-credentials')).toBeNull();
		expect(res.headers.get('cache-control')).toBe('private, no-store');
		expect(res.headers.get('set-cookie')).toBeNull();
		const c = (await res.json()) as Record<string, unknown>;
		expect(c).toMatchObject({
			mode: 'opt-in',
			site: KEY,
			cookieName: 'eb_cc',
			cookieDomain: 'auto',
			endpoints: {
				record: 'https://shop.test/api/consent',
				seen: 'https://shop.test/api/consent/seen'
			},
			links: { privacyPolicy: 'https://blog.example.com/privacy' }
		});
		expect(c.theme).toBeUndefined();
		expect(c.logoUrl).toBeUndefined();
	});

	it('refuses other origins, disabled and unknown sites; answers preflights', async () => {
		const wrong = await CONFIG(
			ev(`/api/consent/config?site=${KEY}`, { method: 'GET', origin: 'https://evil.test' }).event
		);
		expect(wrong.status).toBe(403);
		expect(wrong.headers.get('access-control-allow-origin')).toBeNull();
		for (const key of ['ws_offoffoffoff', 'ws_nonononono1', 'nope'])
			expect(
				(await CONFIG(ev(`/api/consent/config?site=${key}`, { method: 'GET' }).event)).status
			).toBe(404);
		const pre = await CONFIG_OPTIONS(ev('/api/consent/config', { method: 'OPTIONS' }).event);
		expect(pre.status).toBe(204);
		expect(pre.headers.get('access-control-allow-origin')).toBe(SITE);
		const bad = await OPTIONS(
			ev('/api/consent', { method: 'OPTIONS', origin: 'https://evil.test' }).event
		);
		expect(bad.status).toBe(403);
		const ok = await OPTIONS(ev('/api/consent', { method: 'OPTIONS' }).event);
		expect(ok.headers.get('access-control-allow-methods')).toBe('POST');
		expect(ok.headers.get('access-control-allow-headers')).toBe('content-type');
		expect(ok.headers.get('access-control-max-age')).toBe('86400');
		expect((await SEEN_OPTIONS(ev('/api/consent/seen', { method: 'OPTIONS' }).event)).status).toBe(
			204
		);
	});
});

describe('records from another website', () => {
	it('logs the choice with the site, counts in the site table, sets no cookie', async () => {
		const { event, jar } = ev('/api/consent', { body: payload });
		const res = await POST(event);
		expect(res.status).toBe(200);
		expect(res.headers.get('access-control-allow-origin')).toBe(SITE);
		expect(((await res.json()) as { consent: unknown }).consent).toMatchObject({
			mode: 'opt-in',
			action: 'accept_all'
		});
		expect(jar.options.size).toBe(0);
		const [rec] = rows('consent_records');
		expect(rec).toMatchObject({ site: KEY, page: '/post/1', country: 'FR' });
		expect(rows('consent_daily')).toHaveLength(0);
		expect(rows('consent_site_daily')).toEqual([
			expect.objectContaining({ site: KEY, metric: 'accept_all', count: 1 })
		]);
		const seen = ev('/api/consent/seen', {
			body: JSON.stringify({ mode: 'opt-in', device: 'phone', lang: 'fr', site: KEY })
		});
		expect((await SEEN(seen.event)).status).toBe(204);
		expect(seen.jar.options.size).toBe(0);
		expect(rows('consent_site_daily')).toHaveLength(2);
		expect(rows('consent_daily')).toHaveLength(0);
	});

	it('refuses a site key from the wrong origin or a disabled site', async () => {
		expect(
			(await POST(ev('/api/consent', { body: payload, origin: 'https://evil.test' }).event)).status
		).toBe(403);
		const off = payload.replace(KEY, 'ws_offoffoffoff');
		expect(
			(await POST(ev('/api/consent', { body: off, origin: 'https://old.example.com' }).event))
				.status
		).toBe(403);
		expect(rows('consent_records')).toHaveLength(0);
	});
});

describe('store banner config', () => {
	it('adds the store logo and name when shown', async () => {
		await setSetting('store.logoUrl', '/media/logo.png');
		await setSetting('store.name', 'Bliss');
		const jar = cookieJar();
		const url = new URL('https://shop.test/');
		const c = await clientConfigFor({
			url,
			request: new Request(url),
			cookies: jar.cookies,
			platform: { cf: { country: 'DE' } }
		} as never);
		expect(c).toMatchObject({ logoUrl: '/media/logo.png', brandName: 'Bliss' });
	});
});
