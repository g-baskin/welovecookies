// Regression tests for the security and quality review fixes.
import { describe, expect, it } from 'vitest';
import { ipKey, readCapped } from './auth.ts';
import { csvCell } from './csv.ts';
import { getSite } from './db.ts';
import { route } from './index.ts';
import { handleRecord } from './record.ts';
import { createRequest, IP_DAILY_LIMIT, parseRequestForm, requestCounts } from './requests.ts';
import { parseSettings, safeCssValue, saveSettings, siteSettings } from './settings.ts';
import { addTestSite, TEST_KEY, TEST_ORIGIN, testDb } from './test-d1.ts';

const DAY = 86_400_000;
const now = Date.UTC(2026, 10, 9, 12);

describe('review fixes', () => {
	it('refuses emails that could add mailto headers', () => {
		for (const e of ['a@b.co?bcc=evil%40x.com', 'a@b.co&cc=x@y.z', 'a#b@c.co', 'a/b@c.co'])
			expect(parseRequestForm({ kind: 'copy', email: e }).ok, e).toBe(false);
		expect(parseRequestForm({ kind: 'copy', email: 'first.last+tag@mail.example.co.uk' }).ok).toBe(true);
	});
	it('limits privacy requests per IP per day', async () => {
		const db = testDb();
		addTestSite(db);
		const place = { country: null, regionCode: null };
		for (let i = 0; i < IP_DAILY_LIMIT; i++)
			expect((await createRequest(db, TEST_KEY, { kind: 'copy', email: `p${i}@b.co`, name: '', message: '' }, place, now + i, 'iphash')).ok).toBe(true);
		expect((await createRequest(db, TEST_KEY, { kind: 'copy', email: 'other@b.co', name: '', message: '' }, place, now + 10, 'iphash')).ok).toBe(false);
	});
	it('counts a request due today as not overdue, like the label', async () => {
		const db = testDb();
		addTestSite(db);
		db.sql.prepare("INSERT INTO privacy_requests (id, site, created_at, kind, email, due_at) VALUES ('pr_aaaaaaaaaaaaaaaa', ?, 0, 'copy', 'a@b.co', ?), ('pr_bbbbbbbbbbbbbbbb', ?, 0, 'copy', 'c@d.co', ?)").run(TEST_KEY, now - 3600_000, TEST_KEY, now - DAY);
		expect(await requestCounts(db, TEST_KEY, now)).toEqual({ open: 2, overdue: 1 });
	});
	it('stamps a record with the version the visitor saw, never a future one', async () => {
		const db = testDb();
		addTestSite(db);
		db.sql.prepare('UPDATE sites SET rev = 3').run();
		const post = (rev: unknown) =>
			handleRecord(new Request('https://w.example/api/consent', { method: 'POST', headers: { origin: TEST_ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify({ id: 'k3J9x_aB2cD4eF6g', action: 'reject_all', grants: { preferences: false, analytics: false, marketing: false }, mode: 'opt-in', rev, lang: 'en', device: 'desktop', gpc: false, page: '/', site: TEST_KEY }) }), { DB: db }, now);
		expect((await (await post(2)).json()).consent.rev).toBe(2);
		expect((await (await post(9)).json()).consent.rev).toBe(3);
		expect((await (await post('x')).json()).consent.rev).toBe(3);
	});
	it('blocks CSS values that load from another server', () => {
		for (const v of ['url(https://x/p.png)', 'image-set("a.png" 1x)', '@import', 'red;}']) expect(safeCssValue(v), v).toBe(false);
		expect(safeCssValue('#1d4ed8')).toBe(true);
		expect(safeCssValue('8px')).toBe(true);
		expect(parseSettings({ theme: { bg: 'URL(x)' } }).theme).toEqual({});
	});
	it('does not ask again when languages are only reordered', async () => {
		const db = testDb();
		addTestSite(db, { settings: { texts: { de: { title: 'A' }, fr: { title: 'B' } } } });
		const site = (await getSite(db, TEST_KEY))!;
		const s = siteSettings(site);
		expect(await saveSettings(db, site, { ...s, texts: { fr: { title: 'B' }, de: { title: 'A' } } }, { now })).toEqual({ bumped: false });
	});
	it('defuses formulas behind spaces and full-width signs', () => {
		for (const v of [' =1+1', '　=1', '＝SUM(A1)', '|cmd', '%0A']) expect(csvCell(v).replace(/^"/, '').startsWith("'"), v).toBe(true);
		expect(csvCell("it's")).toBe("it's");
	});
	it('reads bodies without a length header but stops past the cap', async () => {
		const stream = (n: number) => new Request('https://w.example/', { method: 'POST', body: new ReadableStream({ start(c) { c.enqueue(new Uint8Array(n).fill(97)); c.close(); } }), duplex: 'half' } as RequestInit);
		expect(await readCapped(stream(10), 100)).toBe('a'.repeat(10));
		expect(await readCapped(stream(200), 100)).toBeNull();
	});
	it('treats a whole IPv6 /64 as one address for limits', () => {
		expect(ipKey('2001:db8:1:2:aaaa::1')).toBe(ipKey('2001:db8:1:2:ffff:1:2:3'));
		expect(ipKey('2001:db8::1')).toBe('2001:db8:0:0::/64');
		expect(ipKey('203.0.113.9')).toBe('203.0.113.9');
	});
	it('answers 429 when the public rate limit is used up', async () => {
		const db = testDb();
		addTestSite(db);
		const env = { DB: db, SESSION_SECRET: 's'.repeat(40), PUBLIC_LIMITER: { limit: async () => ({ success: false }) } };
		const r = await route(new Request(`https://w.example/api/consent/config?site=${TEST_KEY}`, { headers: { origin: TEST_ORIGIN } }), env, now);
		expect(r.status).toBe(429);
		const opt = await route(new Request('https://w.example/api/consent', { method: 'OPTIONS', headers: { origin: TEST_ORIGIN } }), env, now);
		expect(opt.status).toBe(204);
	});
});
