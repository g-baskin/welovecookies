import { request as httpRequest, createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import type { Env } from '../db.ts';
import { addTestSite, TEST_KEY, TEST_ORIGIN, testDb } from '../test-d1.ts';
import {
	clientIp,
	createHandler,
	memoryLimiter,
	msUntilDaily,
	publicOrigin,
	type NodeOptions
} from './http.ts';

const PUB = 'https://consent.example.net';
const secrets = { ADMIN_PASSWORD: 'correct horse battery', SESSION_SECRET: 's'.repeat(40) };
const servers: Server[] = [];
afterEach(() => {
	for (const s of servers.splice(0)) s.close();
});

async function start(o: Partial<NodeOptions> = {}, handle?: Parameters<typeof createHandler>[1]) {
	const env: Env = o.env ?? { DB: testDb(), ...secrets };
	const server = createServer(
		createHandler({ env, publicUrl: PUB, script: Buffer.from('/*! wlc */'), ...o }, handle)
	);
	servers.push(server);
	await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
	const port = (server.address() as AddressInfo).port;
	const call = (
		path: string,
		init: { method?: string; headers?: Record<string, string>; body?: string | Buffer } = {}
	) =>
		new Promise<{
			status: number;
			headers: Record<string, string | string[] | undefined>;
			body: string;
		}>((resolve, reject) => {
			const req = httpRequest(
				{ host: '127.0.0.1', port, path, method: init.method ?? 'GET', headers: init.headers },
				(res) => {
					let body = '';
					res.on('data', (c) => (body += c));
					res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
				}
			);
			req.on('error', reject);
			req.end(init.body);
		});
	return { env, call };
}

/** A route stand-in that reports what it was given. */
function spy() {
	const seen: Request[] = [];
	const handle = async (r: Request) => {
		seen.push(r);
		return new Response('ok');
	};
	return { seen, handle };
}

describe('self-hosted HTTP glue', () => {
	it('shows the setup page while secrets are missing', async () => {
		const { call } = await start({ env: { DB: testDb() } });
		const r = await call('/admin');
		expect(r.body).toContain('ADMIN_PASSWORD');
		expect(r.body).toContain('admin/.env');
	});
	it('serves the banner script with caching and answers HEAD without a body', async () => {
		const { call } = await start();
		const r = await call('/welovecookies.min.js');
		expect(r.status).toBe(200);
		expect(r.body).toBe('/*! wlc */');
		expect(r.headers['content-type']).toBe('text/javascript; charset=utf-8');
		expect(r.headers['cache-control']).toBe('public, max-age=3600');
		const again = await call('/welovecookies.min.js', {
			headers: { 'if-none-match': String(r.headers.etag) }
		});
		expect(again.status).toBe(304);
		const head = await call('/welovecookies.min.js', { method: 'HEAD' });
		expect(head.status).toBe(200);
		expect(head.body).toBe('');
	});
	it('runs the real admin routes', async () => {
		const db = testDb();
		addTestSite(db);
		const { call } = await start({ env: { DB: db, ...secrets } });
		expect((await call('/admin')).headers.location).toBe('/admin/login');
		const cfg = await call(`/api/consent/config?site=${TEST_KEY}`, {
			headers: { origin: TEST_ORIGIN }
		});
		expect(cfg.status).toBe(200);
		expect(JSON.parse(cfg.body).endpoints.record).toBe(`${PUB}/api/consent`);
		expect(
			(await call('/api/consent/config?site=ws_unknown00000', { headers: { origin: TEST_ORIGIN } }))
				.status
		).toBe(404);
	});
	it('builds the URL from WLC_PUBLIC_URL, never the Host header', async () => {
		const { seen, handle } = spy();
		const { call } = await start({}, handle);
		await call('/api/consent/config?site=x', { headers: { host: 'evil.test' } });
		await call('//evil.test/admin?a=1');
		expect(seen.map((r) => r.url)).toEqual([
			`${PUB}/api/consent/config?site=x`,
			`${PUB}/admin?a=1`
		]);
	});
	it('ignores a visitor-sent IP header and only trusts X-Forwarded-For when told to', async () => {
		const a = spy();
		const plain = await start({}, a.handle);
		await plain.call('/x', {
			headers: { 'cf-connecting-ip': '9.9.9.9', 'x-forwarded-for': '8.8.8.8' }
		});
		expect(a.seen[0].headers.get('cf-connecting-ip')).toBe('127.0.0.1');
		const b = spy();
		const proxied = await start({ trustProxy: true }, b.handle);
		await proxied.call('/x', {
			headers: { 'cf-connecting-ip': '9.9.9.9', 'x-forwarded-for': '6.6.6.6, 203.0.113.7' }
		});
		await proxied.call('/x', { headers: { 'x-forwarded-for': 'not-an-ip' } });
		expect(b.seen.map((r) => r.headers.get('cf-connecting-ip'))).toEqual([
			'203.0.113.7',
			'127.0.0.1'
		]);
	});
	it('reads visitor location only from configured headers', async () => {
		const a = spy();
		const off = await start({}, a.handle);
		await off.call('/x', { headers: { 'cf-ipcountry': 'US', 'cf-region-code': 'CA' } });
		expect((a.seen[0] as unknown as { cf?: unknown }).cf).toBeUndefined();
		const b = spy();
		const on = await start(
			{ countryHeader: 'cf-ipcountry', regionHeader: 'cf-region-code' },
			b.handle
		);
		await on.call('/x', { headers: { 'cf-ipcountry': 'US', 'cf-region-code': 'CA' } });
		expect((b.seen[0] as unknown as { cf?: unknown }).cf).toEqual({
			country: 'US',
			regionCode: 'CA'
		});
	});
	it('gives the strictest mode without a location and the local mode with one', async () => {
		const db = testDb();
		addTestSite(db);
		const env = { DB: db, ...secrets };
		const mode = async (o: Partial<NodeOptions>, headers: Record<string, string>) =>
			JSON.parse(
				(
					await (
						await start({ env, ...o })
					).call(`/api/consent/config?site=${TEST_KEY}`, {
						headers: { origin: TEST_ORIGIN, ...headers }
					})
				).body
			).mode;
		expect(await mode({}, { 'cf-ipcountry': 'US' })).toBe('opt-in');
		expect(await mode({ countryHeader: 'cf-ipcountry' }, { 'cf-ipcountry': 'US' })).not.toBe(
			'opt-in'
		);
	});
	it('limits the public endpoints per visitor', async () => {
		const db = testDb();
		addTestSite(db);
		const { call } = await start({ env: { DB: db, ...secrets, PUBLIC_LIMITER: memoryLimiter(2) } });
		const get = () =>
			call(`/api/consent/config?site=${TEST_KEY}`, { headers: { origin: TEST_ORIGIN } });
		expect((await get()).status).toBe(200);
		expect((await get()).status).toBe(200);
		const r = await get();
		expect(r.status).toBe(429);
		expect(r.headers['retry-after']).toBe('60');
	});
	it('keeps every Set-Cookie header', async () => {
		const { call } = await start({}, async () => {
			const h = new Headers();
			h.append('set-cookie', 'a=1; Path=/');
			h.append('set-cookie', 'b=2; Path=/');
			return new Response('ok', { headers: h });
		});
		expect((await call('/x')).headers['set-cookie']).toEqual(['a=1; Path=/', 'b=2; Path=/']);
	});
	it('refuses bodies over the cap and passes smaller ones through', async () => {
		const { seen, handle } = spy();
		const { call } = await start({ maxBody: 10 }, handle);
		expect((await call('/x', { method: 'POST', body: 'x'.repeat(11) })).status).toBe(413);
		expect(
			(
				await call('/x', {
					method: 'POST',
					body: 'hello',
					headers: { 'content-type': 'text/plain' }
				})
			).status
		).toBe(200);
		expect(seen.length).toBe(1);
		expect(await seen[0].text()).toBe('hello');
	});
	it('answers 500 when the route throws', async () => {
		const { call } = await start({}, async () => {
			throw new Error('boom');
		});
		const r = await call('/x');
		expect(r.status).toBe(500);
		expect(r.body).toBe('Something went wrong.');
	});
});

describe('helpers', () => {
	it('accepts only a bare origin for WLC_PUBLIC_URL', () => {
		expect(publicOrigin('https://consent.example.com/')).toEqual({
			origin: 'https://consent.example.com'
		});
		expect(publicOrigin(undefined)).toHaveProperty('error');
		expect(publicOrigin('ftp://x.test')).toHaveProperty('error');
		expect(publicOrigin('https://x.test/admin')).toHaveProperty('error');
	});
	it('strips the IPv4-mapped prefix so IPv4 visitors are counted separately', () => {
		const req = (remoteAddress: string, xff?: string) =>
			({ socket: { remoteAddress }, headers: xff ? { 'x-forwarded-for': xff } : {} }) as never;
		expect(clientIp(req('::ffff:203.0.113.9'))).toBe('203.0.113.9');
		expect(clientIp(req('10.0.0.1', '::ffff:198.51.100.2'), true)).toBe('198.51.100.2');
		expect(clientIp(req('2001:db8::1'))).toBe('2001:db8::1');
	});
	it('resets the limiter window and forgets old visitors', async () => {
		let t = 0;
		const l = memoryLimiter(1, 1000, () => t);
		expect((await l.limit({ key: 'a' })).success).toBe(true);
		expect((await l.limit({ key: 'a' })).success).toBe(false);
		t = 1000;
		expect((await l.limit({ key: 'a' })).success).toBe(true);
	});
	it('schedules the daily job for the next 03:17 UTC', () => {
		expect(msUntilDaily(Date.UTC(2026, 10, 9, 3, 0))).toBe(17 * 60_000);
		expect(msUntilDaily(Date.UTC(2026, 10, 9, 3, 17))).toBe(86_400_000);
	});
});
