import { describe, expect, it } from 'vitest';
import {
	createSession,
	ipHash,
	LOGIN_LIMIT,
	loginBlocked,
	noteFailedLogin,
	clearFailedLogins,
	passwordMatches,
	sameOrigin,
	SESSION_MS,
	sessionCookie,
	setupProblem,
	verifySession
} from './auth.ts';
import { testDb } from './test-d1.ts';

const env = { ADMIN_PASSWORD: 'correct horse battery', SESSION_SECRET: 'x'.repeat(40) };
const now = 1_800_000_000_000;

describe('admin session', () => {
	it('accepts its own cookie until it expires', async () => {
		const v = await createSession(env, now);
		expect(await verifySession(env, v, now + 1000)).toBe(true);
		expect(await verifySession(env, v, now + SESSION_MS + 1)).toBe(false);
	});
	it('rejects tampered, foreign and empty values', async () => {
		const v = await createSession(env, now);
		const [exp, sig] = v.split('.');
		expect(await verifySession(env, `${Number(exp) + 1}.${sig}`, now)).toBe(false);
		expect(await verifySession({ ...env, SESSION_SECRET: 'y'.repeat(40) }, v, now)).toBe(false);
		expect(await verifySession(env, null, now)).toBe(false);
		expect(await verifySession(env, 'abc', now)).toBe(false);
	});
	it('signs everyone out when the password changes', async () => {
		const v = await createSession(env, now);
		expect(await verifySession({ ...env, ADMIN_PASSWORD: 'a new password!' }, v, now)).toBe(false);
	});
	it('sets a host-only, HttpOnly, Secure, SameSite=Strict cookie', () => {
		const c = sessionCookie('v');
		for (const part of ['__Host-', 'HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', 'Max-Age=43200'])
			expect(c).toContain(part);
		expect(c).not.toContain('Domain');
	});
	it('refuses to run without strong secrets', () => {
		expect(setupProblem({})).toMatch(/ADMIN_PASSWORD/);
		expect(setupProblem({ ADMIN_PASSWORD: 'short' })).toMatch(/ADMIN_PASSWORD/);
		expect(setupProblem({ ADMIN_PASSWORD: env.ADMIN_PASSWORD, SESSION_SECRET: 'short' })).toMatch(/SESSION_SECRET/);
		expect(setupProblem(env)).toBeNull();
	});
});

describe('password and sign-in limit', () => {
	it('matches only the exact password', async () => {
		expect(await passwordMatches(env, env.ADMIN_PASSWORD)).toBe(true);
		expect(await passwordMatches(env, `${env.ADMIN_PASSWORD} `)).toBe(false);
		expect(await passwordMatches(env, '')).toBe(false);
	});
	it('blocks after 5 failures in 15 minutes and stores only a hash', async () => {
		const db = testDb();
		const req = new Request('https://admin.test/admin/login', { headers: { 'cf-connecting-ip': '203.0.113.9' } });
		const h = await ipHash(env.SESSION_SECRET, req);
		expect(h).not.toContain('203.0.113.9');
		for (let i = 0; i < LOGIN_LIMIT; i++) {
			expect(await loginBlocked(db, h, now)).toBe(false);
			await noteFailedLogin(db, h, now);
		}
		expect(await loginBlocked(db, h, now)).toBe(true);
		expect(await loginBlocked(db, h, now + 16 * 60_000)).toBe(false);
		await clearFailedLogins(db, h);
		expect(await loginBlocked(db, h, now)).toBe(false);
		const stored = db.sql.prepare('SELECT ip_hash FROM rate_events').all();
		expect(JSON.stringify(stored)).not.toContain('203.0.113');
	});
});

describe('same-origin admin posts', () => {
	const post = (headers: Record<string, string>) =>
		new Request('https://admin.test/admin/sites', { method: 'POST', headers });
	it('accepts the admin origin only', () => {
		expect(sameOrigin(post({ origin: 'https://admin.test' }))).toBe(true);
		expect(sameOrigin(post({ origin: 'https://evil.test' }))).toBe(false);
		expect(sameOrigin(post({ origin: 'null' }))).toBe(false);
		expect(sameOrigin(post({}))).toBe(false);
		expect(sameOrigin(post({ 'sec-fetch-site': 'same-origin' }))).toBe(true);
	});
});
