import { describe, expect, it } from 'vitest';
import { daily, route } from './index.ts';
import { RETENTION_MS } from './log.ts';
import { addTestSite, TEST_KEY, TEST_ORIGIN, testDb } from './test-d1.ts';

const W = 'https://admin.example.net';
const now = Date.UTC(2026, 10, 9, 12);
const secrets = { ADMIN_PASSWORD: 'correct horse battery', SESSION_SECRET: 's'.repeat(40) };

function app() {
	const db = testDb();
	const env = { DB: db, ...secrets };
	let cookie = '';
	const call = async (path: string, init: RequestInit & { form?: Record<string, string> } = {}) => {
		const headers = new Headers(init.headers);
		if (cookie && !headers.has('cookie')) headers.set('cookie', cookie);
		let body = init.body;
		if (init.form) {
			body = new URLSearchParams(init.form);
			headers.set('content-type', 'application/x-www-form-urlencoded');
			if (!headers.has('origin')) headers.set('origin', W);
		}
		return route(new Request(`${W}${path}`, { ...init, headers, body }), env, now);
	};
	const login = async () => {
		const r = await call('/admin/login', {
			method: 'POST',
			form: { password: secrets.ADMIN_PASSWORD }
		});
		cookie = (r.headers.get('set-cookie') ?? '').split(';')[0];
		return r;
	};
	return { db, env, call, login };
}

describe('admin sign-in', () => {
	it('redirects to sign-in, refuses wrong passwords and limits attempts', async () => {
		const { call } = app();
		const r = await call('/admin');
		expect(r.status).toBe(303);
		expect(r.headers.get('location')).toBe('/admin/login');
		for (let i = 0; i < 5; i++)
			expect(
				(await call('/admin/login', { method: 'POST', form: { password: 'nope' } })).status
			).toBe(401);
		expect(
			(await call('/admin/login', { method: 'POST', form: { password: secrets.ADMIN_PASSWORD } }))
				.status
		).toBe(429);
	});
	it('signs in with the right password and a same-origin form', async () => {
		const { call, login } = app();
		expect(
			(
				await call('/admin/login', {
					method: 'POST',
					form: { password: secrets.ADMIN_PASSWORD },
					headers: { origin: 'https://evil.test' }
				})
			).status
		).toBe(403);
		const r = await login();
		expect(r.status).toBe(303);
		expect(r.headers.get('set-cookie')).toMatch(
			/^__Host-wlc_admin=.+HttpOnly; Secure; SameSite=Strict/
		);
		const page = await call('/admin');
		expect(page.status).toBe(200);
		expect(page.headers.get('content-security-policy')).toContain("default-src 'none'");
		expect(await page.text()).toContain('Add your first website');
	});
	it('shows setup steps instead of the admin when secrets are missing', async () => {
		const db = testDb();
		const r = await route(new Request(`${W}/admin`), { DB: db }, now);
		expect(r.status).toBe(503);
		expect(await r.text()).toContain('wrangler secret put ADMIN_PASSWORD');
	});
});

describe('admin pages', () => {
	it('blocks posts without a session or from another origin', async () => {
		const { call, login } = app();
		expect(
			(
				await call('/admin/sites', {
					method: 'POST',
					form: { action: 'add', name: 'X', address: 'x.example' }
				})
			).status
		).toBe(403);
		await login();
		expect(
			(
				await call('/admin/sites', {
					method: 'POST',
					form: { action: 'add', name: 'X', address: 'x.example' },
					headers: { origin: 'https://evil.test' }
				})
			).status
		).toBe(403);
	});
	it('adds a website, shows its snippet and escapes owner text everywhere', async () => {
		const { call, login, db } = app();
		await login();
		const r = await call('/admin/sites', {
			method: 'POST',
			form: {
				action: 'add',
				name: '<img src=x onerror=alert(1)>',
				address: 'shop.example.org',
				privacy: ''
			}
		});
		expect(r.status).toBe(303);
		const key = (db.sql.prepare('SELECT key FROM sites').get() as { key: string }).key;
		for (const path of [
			'/admin',
			'/admin/sites',
			'/admin/banner',
			'/admin/cookies',
			'/admin/records',
			'/admin/requests',
			'/admin/tracking'
		]) {
			const res = await call(`${path}?site=${key}`);
			expect(res.status, path).toBe(200);
			const body = await res.text();
			expect(body, path).not.toContain('<img src=x');
			expect(body, path).toContain('&lt;img src=x');
		}
		const sitesBody = await (await call('/admin/sites')).text();
		expect(sitesBody).toContain(`data-site=&quot;${key}&quot;`);
		expect(
			(
				await call('/admin/sites', {
					method: 'POST',
					form: { action: 'add', name: 'Again', address: 'https://shop.example.org/' }
				})
			).status
		).toBe(400);
	});
	it('saves banner wording, raising the version, and rejects unsafe CSS', async () => {
		const { call, login, db } = app();
		addTestSite(db);
		await login();
		const bad = await call('/admin/banner', {
			method: 'POST',
			form: { site: TEST_KEY, lang: '*', action: 'save', theme_primary: 'red;}</style>' }
		});
		expect(bad.status).toBe(400);
		const ok = await call('/admin/banner', {
			method: 'POST',
			form: {
				site: TEST_KEY,
				lang: 'de',
				action: 'save',
				enabled: 'on',
				position: 'bottom-right',
				text_title: 'Kekse?',
				theme_primary: '#123456'
			}
		});
		expect(ok.headers.get('location')).toContain('ok=asked');
		const row = db.sql.prepare('SELECT rev, settings_json FROM sites').get() as {
			rev: number;
			settings_json: string;
		};
		expect(row.rev).toBe(2);
		expect(JSON.parse(row.settings_json)).toMatchObject({
			position: 'bottom-right',
			texts: { de: { title: 'Kekse?' } },
			theme: { primary: '#123456' }
		});
	});
	it('adds and removes cookies', async () => {
		const { call, login, db } = app();
		addTestSite(db);
		await login();
		const add = await call('/admin/cookies', {
			method: 'POST',
			form: {
				site: TEST_KEY,
				action: 'add',
				count: '1',
				name: '_ga',
				provider: 'Google',
				category: 'analytics',
				purpose: 'Counts visits.',
				duration: '2 years'
			}
		});
		expect(add.status).toBe(303);
		const stale = await call('/admin/cookies', {
			method: 'POST',
			form: { site: TEST_KEY, action: 'remove', count: '5', index: '0' }
		});
		expect(stale.status).toBe(400);
		await call('/admin/cookies', {
			method: 'POST',
			form: { site: TEST_KEY, action: 'remove', count: '2', index: '0' }
		});
		const cookies = JSON.parse(
			(db.sql.prepare('SELECT settings_json FROM sites').get() as { settings_json: string })
				.settings_json
		).cookies;
		expect(cookies.map((c: { name: string }) => c.name)).toEqual(['_ga']);
	});
	it('exports records as CSV with formulas defused', async () => {
		const { call, login, db } = app();
		addTestSite(db);
		db.sql
			.prepare(
				"INSERT INTO consent_records (site, consent_id, created_at, action, preferences, analytics, marketing, mode, rev, device, gpc, page) VALUES (?, 'k3J9x_aB2cD4eF6g', ?, 'accept_all', 1, 1, 1, 'opt-in', 1, 'desktop', 0, '=HYPERLINK(1)')"
			)
			.run(TEST_KEY, now);
		await login();
		const r = await call(`/admin/records.csv?site=${TEST_KEY}&from=2026-11-01&to=2026-11-09`);
		expect(r.headers.get('content-type')).toContain('text/csv');
		const csv = await r.text();
		expect(csv).toContain('k3J9x_aB2cD4eF6g');
		expect(csv).toContain("'=HYPERLINK(1)");
		expect(
			(await call(`/admin/records.csv?site=${TEST_KEY}&from=2026-11-09&to=2026-11-01`)).status
		).toBe(400);
		const lookup = await (await call(`/admin/records?site=${TEST_KEY}&id=k3J9x_aB2cD4eF6g`)).text();
		expect(lookup).toContain('Records for k3J9x_aB2cD4eF6g');
	});
	it('updates a request and deletes it only after confirmation', async () => {
		const { call, login, db } = app();
		addTestSite(db);
		db.sql
			.prepare(
				"INSERT INTO privacy_requests (id, site, created_at, kind, email, due_at) VALUES ('pr_aaaaaaaaaaaaaaaa', ?, ?, 'copy', 'a@b.co', ?)"
			)
			.run(TEST_KEY, now, now + 1);
		await login();
		expect((await call('/admin/requests/pr_aaaaaaaaaaaaaaaa')).status).toBe(200);
		await call('/admin/requests/pr_aaaaaaaaaaaaaaaa', {
			method: 'POST',
			form: { action: 'save', status: 'done', note: 'Sent' }
		});
		expect(db.sql.prepare('SELECT status, note FROM privacy_requests').get()).toEqual({
			status: 'done',
			note: 'Sent'
		});
		expect(
			(
				await call('/admin/requests/pr_aaaaaaaaaaaaaaaa', {
					method: 'POST',
					form: { action: 'delete' }
				})
			).status
		).toBe(400);
		expect(db.sql.prepare('SELECT count(*) AS n FROM privacy_requests').get()).toEqual({ n: 1 });
		await call('/admin/requests/pr_aaaaaaaaaaaaaaaa', {
			method: 'POST',
			form: { action: 'delete', confirm: 'yes' }
		});
		expect(db.sql.prepare('SELECT count(*) AS n FROM privacy_requests').get()).toEqual({ n: 0 });
	});
	it('signs out', async () => {
		const { call, login } = app();
		await login();
		const r = await call('/admin/logout', { method: 'POST', form: {} });
		expect(r.headers.get('set-cookie')).toContain('Max-Age=0');
	});
});

describe('public routes and daily job', () => {
	it('routes banner endpoints and refuses unknown paths', async () => {
		const { call, db } = app();
		addTestSite(db);
		expect(
			(await call(`/api/consent/config?site=${TEST_KEY}`, { headers: { origin: TEST_ORIGIN } }))
				.status
		).toBe(200);
		expect(
			(await call('/api/consent', { method: 'OPTIONS', headers: { origin: TEST_ORIGIN } })).status
		).toBe(204);
		expect((await call('/api/consent', { method: 'GET' })).status).toBe(405);
		expect((await call('/nope')).status).toBe(404);
		expect((await call('/wlc.css')).headers.get('content-type')).toContain('text/css');
	});
	it('purges old records and runs the check for enabled sites', async () => {
		const { db } = app();
		addTestSite(db);
		addTestSite(db, { key: 'ws_offoffoffoff', origin: 'https://off.example', enabled: 0 });
		db.sql
			.prepare(
				"INSERT INTO consent_records (site, consent_id, created_at, action, preferences, analytics, marketing, mode, rev, device, gpc) VALUES (?, 'k3J9x_aB2cD4eF6g', ?, 'accept_all', 1, 1, 1, 'opt-in', 1, 'desktop', 0)"
			)
			.run(TEST_KEY, now - RETENTION_MS - 1);
		const r = await daily(db, now);
		expect(r).toEqual({ purged: { records: 1, daily: 0, rateEvents: 0, more: false }, checked: 1 });
		expect(db.sql.prepare('SELECT site FROM check_results').all()).toEqual([{ site: TEST_KEY }]);
	});
});

describe('monitoring', () => {
	it('answers /health only when the database works', async () => {
		const { call, env } = app();
		const ok = await call('/health');
		expect(ok.status).toBe(200);
		expect(await ok.text()).toBe('ok');
		expect(ok.headers.get('cache-control')).toBe('no-store');
		expect((await call('/health', { method: 'POST' })).status).toBe(405);
		const broken = { ...env, DB: { prepare: () => { throw new Error('disk gone'); } } }; // prettier-ignore
		const errors: unknown[] = [];
		const log = console.error;
		console.error = (...a: unknown[]) => void errors.push(a);
		try {
			const r = await route(new Request(`${W}/health`), broken as unknown as typeof env, now);
			expect(r.status).toBe(503);
		} finally {
			console.error = log;
		}
		expect(errors).toHaveLength(1);
	});
	it('warns on the Overview when the daily job has not run for 2 days', async () => {
		const { call, db, login } = app();
		addTestSite(db, { createdAt: now - 10 * 86_400_000 });
		await login();
		const page = async () =>
			(await (await call(`/admin?site=${TEST_KEY}`)).text()).includes('The daily job has not run');
		expect(await page()).toBe(true); // never ran
		await daily(db, now - 86_400_000);
		expect(await page()).toBe(false); // ran yesterday
		db.sql.prepare('UPDATE check_results SET at = ?').run(now - 3 * 86_400_000);
		expect(await page()).toBe(true); // last run 3 days ago
		db.sql.prepare('UPDATE sites SET enabled = 0').run();
		expect(await page()).toBe(false); // the daily job skips websites that are off
	});
});
