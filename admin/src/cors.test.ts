import { describe, expect, it } from 'vitest';
import { corsHeaders, preflightHeaders, siteForRequest } from './cors.ts';
import { enabledSiteByOrigin } from './db.ts';
import { addTestSite, TEST_KEY, TEST_ORIGIN, testDb } from './test-d1.ts';

describe('exact-origin CORS', () => {
	it('allows only the site’s own origin', async () => {
		const db = testDb();
		addTestSite(db);
		expect((await siteForRequest(db, TEST_KEY, TEST_ORIGIN)).ok).toBe(true);
		for (const o of ['http://example.com', 'https://www.example.com', 'https://example.com.evil.test', 'https://example.com/', 'null', null])
			expect(await siteForRequest(db, TEST_KEY, o)).toEqual({ ok: false, status: 403 });
	});
	it('treats unknown, malformed and switched-off sites as unknown', async () => {
		const db = testDb();
		addTestSite(db, { enabled: 0 });
		expect(await siteForRequest(db, TEST_KEY, TEST_ORIGIN)).toEqual({ ok: false, status: 404 });
		expect(await siteForRequest(db, 'ws_nope', TEST_ORIGIN)).toEqual({ ok: false, status: 404 });
		expect(await siteForRequest(db, { key: TEST_KEY }, TEST_ORIGIN)).toEqual({ ok: false, status: 404 });
		expect(await enabledSiteByOrigin(db, TEST_ORIGIN)).toBeNull();
	});
	it('never allows credentials or a wildcard', () => {
		const h = { ...corsHeaders(TEST_ORIGIN), ...preflightHeaders(TEST_ORIGIN, 'POST') };
		expect(h['access-control-allow-origin']).toBe(TEST_ORIGIN);
		expect(h.vary).toBe('Origin');
		expect(Object.keys(h)).not.toContain('access-control-allow-credentials');
	});
});
