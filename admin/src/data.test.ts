import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from './csv.ts';
import { getSite } from './db.ts';
import { overview, purgeOld, RETENTION_MS, tally } from './log.ts';
import {
	createRequest,
	deleteRequest,
	dueDaysFor,
	dueLabel,
	getRequest,
	listRequests,
	parseRequestForm,
	requestCounts,
	updateRequest
} from './requests.ts';
import {
	defaultSettings,
	listVersions,
	parseCookie,
	parseSettings,
	saveSettings,
	siteSettings
} from './settings.ts';
import { createSite, normaliseWebsite, parsePrivacyUrl, parseSiteForm, snippet } from './sites.ts';
import { addTestSite, TEST_KEY, testDb } from './test-d1.ts';
import { trackingIssues, runCheck, latestCheck, type TrackingFacts } from './tracking.ts';

const DAY = 86_400_000;
const now = Date.UTC(2026, 10, 9, 12);

describe('settings', () => {
	it('keeps valid fields and defaults the rest', () => {
		const s = parseSettings({
			position: 'bottom-right',
			theme: { primary: '#123456', bg: 'red;}body{x' },
			texts: { de: { title: 'Hallo', bogus: 'x' }, xx: { title: 'no' } },
			cookies: [{ name: 'a' }],
			integrations: { meta: true }
		});
		expect(s.position).toBe('bottom-right');
		expect(s.theme).toEqual({ primary: '#123456' });
		expect(s.texts).toEqual({ de: { title: 'Hallo' } });
		expect(s.cookies).toEqual([]);
		expect(s.integrations.meta).toBe(true);
		expect(s.integrations.scriptBlocking).toBe(true);
		expect(parseSettings('not json')).toEqual(defaultSettings());
	});
	it('holds known trackers by default, also for settings saved before the option existed', () => {
		expect(defaultSettings().integrations.knownTrackers).toBe(true);
		const old = { integrations: { googleConsentMode: true, scriptBlocking: true } };
		expect(parseSettings(JSON.stringify(old)).integrations.knownTrackers).toBe(true);
		expect(
			parseSettings({ integrations: { knownTrackers: false } }).integrations.knownTrackers
		).toBe(false);
	});
	it('validates cookie rows in plain words', () => {
		expect(
			parseCookie({
				name: '_ga',
				provider: 'Google',
				category: 'analytics',
				purpose: 'Counts visits.',
				duration: '2 years'
			}).ok
		).toBe(true);
		const bad = parseCookie({
			name: '_ga',
			provider: 'Google',
			category: 'ads',
			purpose: 'x',
			duration: '1'
		});
		expect(bad).toEqual({ ok: false, error: 'Choose a category.' });
	});
	it('raises the revision and snapshots both versions when wording changes', async () => {
		const db = testDb();
		const key = addTestSite(db);
		const site = (await getSite(db, key))!;
		const next = { ...siteSettings(site), texts: { '*': { title: 'Cookies?' } } };
		expect(await saveSettings(db, site, next, { now })).toEqual({ bumped: true });
		const after = (await getSite(db, key))!;
		expect(after.rev).toBe(2);
		expect(siteSettings(after).texts).toEqual({ '*': { title: 'Cookies?' } });
		const v = await listVersions(db, key);
		expect(v.map((x) => x.rev)).toEqual([2, 1]);
		expect(JSON.parse(v[0].texts_json).texts['*'].title).toBe('Cookies?');
		expect(JSON.parse(v[1].texts_json).texts).toEqual({});
	});
	it('does not ask again for look-only changes or cookie label edits, but does on request', async () => {
		const db = testDb();
		const key = addTestSite(db);
		let site = (await getSite(db, key))!;
		const s = siteSettings(site);
		expect(
			await saveSettings(
				db,
				site,
				{ ...s, position: 'bottom-center', theme: { primary: '#000' } },
				{ now }
			)
		).toEqual({ bumped: false });
		site = (await getSite(db, key))!;
		const relabelled = {
			...siteSettings(site),
			cookies: siteSettings(site).cookies.map((c) => ({ ...c, label: 'New label' }))
		};
		expect(await saveSettings(db, site, relabelled, { now })).toEqual({ bumped: false });
		site = (await getSite(db, key))!;
		expect(site.rev).toBe(1);
		expect(await saveSettings(db, site, siteSettings(site), { askAgain: true, now })).toEqual({
			bumped: true
		});
		expect((await getSite(db, key))!.rev).toBe(2);
	});
});

describe('sites', () => {
	it('normalises addresses (saved as https) and refuses pages and credentials', () => {
		expect(normaliseWebsite('Example.com')).toBe('https://example.com');
		expect(normaliseWebsite('https://www.example.com/')).toBe('https://www.example.com');
		expect(normaliseWebsite('http://example.com')).toBe('https://example.com');
		expect(normaliseWebsite('http://localhost:4173')).toBe('http://localhost:4173');
		for (const bad of [
			'example.com/page',
			'https://u:p@example.com',
			'example',
			'javascript:alert(1)',
			'https://example.com?x=1',
			''
		])
			expect(normaliseWebsite(bad)).toBeNull();
		expect(parsePrivacyUrl('http://example.com/privacy')).toBeNull();
		expect(parsePrivacyUrl('')).toBe('');
	});
	it('creates a site with a key, default settings and the first version snapshot', async () => {
		const db = testDb();
		const f = parseSiteForm({
			name: 'Blog',
			address: 'blog.example.org',
			privacy: 'https://blog.example.org/privacy'
		});
		expect(f.ok).toBe(true);
		if (!f.ok) return;
		const r = await createSite(db, f.value, now);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.key).toMatch(/^ws_[A-Za-z0-9_-]{12}$/);
		expect((await getSite(db, r.key))!.origin).toBe('https://blog.example.org');
		expect((await listVersions(db, r.key)).map((v) => v.rev)).toEqual([1]);
		expect(await createSite(db, f.value, now)).toMatchObject({ ok: false });
		expect(snippet('https://w.example', r.key)).toBe(
			`<script src="https://w.example/welovecookies.min.js" data-site="${r.key}" async></script>`
		);
	});
});

describe('privacy requests', () => {
	it('uses the strictest answer time', () => {
		expect([dueDaysFor('BR'), dueDaysFor('US'), dueDaysFor('DE'), dueDaysFor(null)]).toEqual([
			15, 45, 30, 30
		]);
		expect(dueLabel(now + 2 * DAY, now).text).toBe('Due in 2 days');
		expect(dueLabel(now - DAY, now)).toEqual({ text: 'Overdue by 1 day', overdue: true });
	});
	it('validates the form', () => {
		expect(parseRequestForm({ kind: 'copy', email: 'a@b.co' })).toMatchObject({ ok: true });
		expect(parseRequestForm({ kind: 'copy', email: 'a@b' })).toMatchObject({ ok: false });
		expect(
			parseRequestForm({ kind: 'copy', email: 'a@b.co', message: 'x'.repeat(1001) })
		).toMatchObject({ ok: false });
	});
	it('updates status, stamps closing once, counts overdue and deletes exactly one', async () => {
		const db = testDb();
		addTestSite(db);
		const a = await createRequest(
			db,
			TEST_KEY,
			{ kind: 'copy', email: 'a@b.co', name: '', message: '' },
			{ country: 'US', regionCode: null },
			now - 50 * DAY
		);
		const b = await createRequest(
			db,
			TEST_KEY,
			{ kind: 'delete', email: 'c@d.co', name: '', message: '' },
			{ country: 'DE', regionCode: null },
			now
		);
		if (!a.ok || !b.ok) throw new Error('create failed');
		expect(await requestCounts(db, TEST_KEY, now)).toEqual({ open: 2, overdue: 1 });
		expect(await updateRequest(db, a.id, 'done', 'Sent by email', now)).toBe(true);
		expect(await updateRequest(db, a.id, 'declined', 'Changed', now + 5)).toBe(true);
		expect((await getRequest(db, a.id))!.closed_at).toBe(now);
		await updateRequest(db, a.id, 'in_progress', '', now);
		expect((await getRequest(db, a.id))!.closed_at).toBeNull();
		await updateRequest(db, a.id, 'done', '', now);
		expect((await listRequests(db, TEST_KEY, 'open')).map((r) => r.id)).toEqual([b.id]);
		expect((await listRequests(db, TEST_KEY, 'closed')).map((r) => r.id)).toEqual([a.id]);
		expect(await deleteRequest(db, a.id)).toBe(true);
		expect(await deleteRequest(db, a.id)).toBe(false);
		expect((await listRequests(db, TEST_KEY, 'all')).map((r) => r.id)).toEqual([b.id]);
	});
});

describe('csv', () => {
	it('defuses formulas and quotes separators', () => {
		for (const f of ['=1+1', '+1', '-1', '@SUM(A1)', '\t=x'])
			expect(csvCell(f).replace(/^"/, '').startsWith("'")).toBe(true);
		expect(csvCell('a,b')).toBe('"a,b"');
		expect(csvCell('say "hi"')).toBe('"say ""hi"""');
		expect(csvCell(null)).toBe('');
		expect(toCsv(['A', 'B'], [[1, 'x\ny']])).toBe('﻿A,B\r\n1,"x\ny"\r\n');
	});
});

describe('consent log', () => {
	const insert = (db: ReturnType<typeof testDb>, at: number) =>
		db.sql
			.prepare(
				"INSERT INTO consent_records (site, consent_id, created_at, action, preferences, analytics, marketing, mode, rev, device, gpc) VALUES (?, 'k3J9x_aB2cD4eF6g', ?, 'accept_all', 1, 1, 1, 'opt-in', 1, 'desktop', 0)"
			)
			.run(TEST_KEY, at);
	it('purges only what is past retention, in bounded batches that resume the next day', async () => {
		const db = testDb();
		addTestSite(db);
		for (let i = 0; i < 5; i++) insert(db, now - RETENTION_MS - DAY - i);
		insert(db, now - RETENTION_MS + DAY);
		db.sql
			.prepare(
				"INSERT INTO consent_daily (day, site, metric, mode, country, device, count) VALUES ('2020-01-01', ?, 'seen', 'opt-in', '', 'desktop', 3), ('2026-11-01', ?, 'seen', 'opt-in', '', 'desktop', 3)"
			)
			.run(TEST_KEY, TEST_KEY);
		db.sql
			.prepare(
				"INSERT INTO rate_events (kind, ip_hash, at) VALUES ('login', ?, ?), ('request', ?, ?)"
			)
			.run('a', now - 2 * DAY, 'b', now);
		expect(await purgeOld(db, now, 2, 2)).toEqual({
			records: 4,
			daily: 1,
			rateEvents: 1,
			more: true
		});
		expect(await purgeOld(db, now, 2, 2)).toEqual({
			records: 1,
			daily: 0,
			rateEvents: 0,
			more: false
		});
		expect(db.sql.prepare('SELECT count(*) AS n FROM consent_records').get()).toEqual({ n: 1 });
		expect(db.sql.prepare('SELECT day FROM consent_daily').all()).toEqual([{ day: '2026-11-01' }]);
	});
	it('adds up the overview by answer, region group and device', async () => {
		const t = tally([
			{ metric: 'seen', mode: 'opt-in', device: 'phone', n: 10 },
			{ metric: 'accept_all', mode: 'opt-in', device: 'phone', n: 4 },
			{ metric: 'reject_all', mode: 'opt-in-uk', device: 'desktop', n: 2 },
			{ metric: 'acknowledge', mode: 'opt-out', device: 'desktop', n: 3 },
			{ metric: 'gpc', mode: 'opt-out-gpc', device: 'desktop', n: 1 }
		]);
		expect(t.total).toMatchObject({
			seen: 10,
			answered: 9,
			acceptAll: 4,
			rejectAll: 2,
			acknowledge: 3,
			gpc: 1
		});
		expect(t.byRegion.find((g) => g.key === 'ask')!.tally.answered).toBe(6);
		expect(t.byRegion.find((g) => g.key === 'optout')!.tally.answered).toBe(3);
		expect(t.byDevice.phone.acceptAll).toBe(4);
		const db = testDb();
		addTestSite(db);
		db.sql
			.prepare(
				"INSERT INTO consent_daily (day, site, metric, mode, country, device, count) VALUES ('2026-11-09', ?, 'seen', 'opt-in', 'DE', 'desktop', 5), ('2026-11-01', ?, 'seen', 'opt-in', 'DE', 'desktop', 7)"
			)
			.run(TEST_KEY, TEST_KEY);
		expect((await overview(db, TEST_KEY, 7, now)).total.seen).toBe(5);
		expect((await overview(db, TEST_KEY, 30, now)).total.seen).toBe(12);
	});
});

describe('tracking check', () => {
	const facts = (over: Partial<TrackingFacts> = {}, s = defaultSettings()): TrackingFacts => ({
		site: {
			key: TEST_KEY,
			enabled: 1,
			privacy_url: 'https://example.com/privacy',
			created_at: now - 30 * DAY
		},
		settings: s,
		overdueRequests: 0,
		activity: 10,
		...over
	});
	const ids = (f: TrackingFacts, at = now) => trackingIssues(f, at).map((i) => i.id);
	it('passes a healthy site (dated lists still fresh)', () => {
		expect(ids(facts())).toEqual([]);
	});
	it('flags missing policy, banner off, empty list, unlisted integrations, overdue requests and silence', () => {
		const s = {
			...defaultSettings(),
			enabled: false,
			cookies: [],
			integrations: { ...defaultSettings().integrations, posthog: true, meta: true }
		};
		expect(
			ids(
				facts(
					{
						site: { key: TEST_KEY, enabled: 1, privacy_url: '', created_at: now - 30 * DAY },
						overdueRequests: 2
					},
					s
				)
			)
		).toEqual([
			'privacy_policy',
			'banner_off',
			'cookies_empty',
			'unlisted_meta',
			'unlisted_posthog',
			'overdue_requests'
		]);
		expect(ids(facts({ activity: 0 }))).toEqual(['no_views']);
		expect(
			ids(
				facts({
					activity: 0,
					site: {
						key: TEST_KEY,
						enabled: 1,
						privacy_url: 'https://x.example',
						created_at: now - DAY
					}
				})
			)
		).toEqual([]);
	});
	it('accepts either category for Google Consent Mode', () => {
		const s = defaultSettings();
		s.integrations.googleConsentMode = true;
		expect(ids(facts({}, s))).toEqual(['unlisted_googleConsentMode']);
		s.cookies.push({
			name: '_ga',
			provider: 'Google',
			category: 'analytics',
			purpose: 'Counts visits.',
			duration: '2 years'
		});
		expect(ids(facts({}, s))).toEqual([]);
	});
	it('reminds about dated legal lists once they are stale', () => {
		expect(ids(facts(), Date.UTC(2027, 6, 1))).toEqual(['state_list']);
		expect(ids(facts(), Date.UTC(2028, 0, 1))).toEqual(['state_list', 'regions_list']);
	});
	it('stores the latest result per site', async () => {
		const db = testDb();
		addTestSite(db, { privacyUrl: '', createdAt: now - 30 * DAY });
		const site = (await getSite(db, TEST_KEY))!;
		await runCheck(db, site, now);
		await runCheck(db, site, now + 1);
		const r = await latestCheck(db, TEST_KEY);
		expect(r!.at).toBe(now + 1);
		expect(r!.issues.map((i) => i.id)).toEqual(['privacy_policy', 'no_views']);
	});
});
