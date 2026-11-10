import { describe, expect, it } from 'vitest';
import { createConsent, type ConsentWindow } from './consent.ts';
import { decodeConsent, encodeConsent, readCookie } from './cookie.ts';
import type { ConsentConfig, ConsentRecordPayload, StoredConsent } from './types.ts';

const NOW = Date.UTC(2026, 10, 3);
const tick = () => new Promise((r) => setTimeout(r, 5));

function setup(
	over: Partial<ConsentConfig> = {},
	nav: Partial<ConsentWindow['navigator']> = {},
	cookie = '',
	reply?: (b: ConsentRecordPayload) => unknown
) {
	let jar = cookie;
	const writes: string[] = [];
	const posts: { url: string; body: unknown; keepalive?: boolean }[] = [];
	const events: unknown[] = [];
	const document = {
		get cookie() { return jar; },
		set cookie(v: string) { writes.push(v); jar = v.split(';')[0] ?? ''; },
		body: null,
		addEventListener() {}
	} as unknown as Document; // prettier-ignore
	const w: ConsentWindow = {
		document,
		location: { pathname: '/pricing', protocol: 'https:' },
		navigator: { languages: ['de-DE'], userAgent: 'x', maxTouchPoints: 0, ...nav },
		innerWidth: 1440,
		dispatchEvent: (e) => (events.push(e), true)
	};
	const fetch = (async (url: string, init: RequestInit) => {
		const body = JSON.parse(String(init.body));
		posts.push({ url, body, keepalive: init.keepalive });
		return { ok: true, json: async () => (reply ? reply(body) : { ok: true }) };
	}) as unknown as typeof globalThis.fetch;
	const m = createConsent(
		{ mode: 'opt-in', rev: 1, endpoints: { record: '/r', seen: '/s' }, ...over },
		{ root: w, fetch, now: () => NOW, ui: false }
	);
	return { m, w, writes, posts, events, jar: () => jar };
}

describe('consent manager', () => {
	it('opt-in: everything off, accept writes the cookie and logs', async () => {
		const t = setup();
		expect(t.m.get()).toMatchObject({
			mode: 'opt-in',
			lang: 'de',
			device: 'desktop',
			grants: { analytics: false, marketing: false }
		});
		let seen = 0;
		t.m.onChange(() => seen++);
		t.m.acceptAll();
		expect(t.writes[0]).toMatch(
			/^wlc_consent=1\..+; path=\/; SameSite=Lax; max-age=15552000; Secure$/
		);
		const c = decodeConsent(readCookie(t.jar(), 'wlc_consent'));
		expect(c).toMatchObject({
			action: 'accept_all',
			mode: 'opt-in',
			rev: 1,
			grants: { analytics: true, marketing: true }
		});
		await tick();
		expect(seen).toBe(1);
		expect(t.events).toHaveLength(1);
		const rec = t.posts.find((p) => p.url === '/r');
		expect(rec?.keepalive).toBe(true);
		expect(rec?.body).toMatchObject({
			id: c?.id,
			action: 'accept_all',
			lang: 'de',
			page: '/pricing',
			gpc: false
		});
		// Re-choosing keeps the id; withdrawing after granting is recorded as withdraw.
		t.m.save({ preferences: false, analytics: false, marketing: false });
		const c2 = decodeConsent(readCookie(t.jar(), 'wlc_consent'));
		expect(c2?.id).toBe(c?.id);
		expect(c2?.action).toBe('withdraw');
	});

	it('posts seen once when a banner shows', async () => {
		const t = setup();
		t.m.showBanner();
		await tick();
		expect(t.posts.filter((p) => p.url === '/s')).toEqual([
			{ url: '/s', body: { mode: 'opt-in', device: 'desktop', lang: 'de' }, keepalive: true }
		]);
	});

	it('keeps a current stored choice and shows nothing', async () => {
		const c: StoredConsent = {
			id: 'abcdefghijklmnop',
			at: NOW - 1000,
			mode: 'opt-in',
			rev: 1,
			grants: { preferences: false, analytics: true, marketing: false },
			action: 'custom'
		};
		const t = setup({}, {}, `wlc_consent=${encodeConsent(c)}`);
		expect(t.m.get().grants.analytics).toBe(true);
		await tick();
		expect(t.posts).toEqual([]);
	});

	it('opt-out-gpc with GPC saves silently with action gpc', async () => {
		const t = setup({ mode: 'opt-out-gpc' }, { globalPrivacyControl: true });
		const c = decodeConsent(readCookie(t.jar(), 'wlc_consent'));
		expect(c).toMatchObject({ action: 'gpc', grants: { analytics: true, marketing: false } });
		await tick();
		expect(t.posts.find((p) => p.url === '/r')?.body).toMatchObject({ action: 'gpc', gpc: true });
		t.m.acceptAll();
		expect(t.m.get().grants.marketing).toBe(false);
	});

	it('adopts a server correction', async () => {
		const t = setup({}, {}, '', (b) => ({
			ok: true,
			consent: {
				id: b.id,
				at: NOW,
				mode: 'opt-in',
				rev: 1,
				action: 'custom',
				grants: { preferences: false, analytics: true, marketing: false }
			}
		}));
		t.m.acceptAll();
		await tick();
		await tick();
		expect(t.m.get().grants).toEqual({ preferences: false, analytics: true, marketing: false });
		expect(decodeConsent(readCookie(t.jar(), 'wlc_consent'))?.grants.marketing).toBe(false);
	});

	it('hooks createElement for known trackers unless knownTrackers is off', () => {
		const made = () => {
			const createElement = () => ({});
			return { createElement, cookie: '', body: null, addEventListener() {} };
		};
		const root = (document: ReturnType<typeof made>) =>
			({ document, location: { pathname: '/', protocol: 'https:' }, navigator: {}, innerWidth: 1440 }) as unknown as ConsentWindow; // prettier-ignore
		const on = made();
		const before = on.createElement;
		createConsent({ mode: 'opt-in', rev: 1 }, { root: root(on), ui: false });
		expect(on.createElement).not.toBe(before);
		const off = made();
		const native = off.createElement;
		createConsent({ mode: 'opt-in', rev: 1, integrations: { knownTrackers: false } }, { root: root(off), ui: false }); // prettier-ignore
		expect(off.createElement).toBe(native);
	});
	it('never throws on a broken environment', () => {
		expect(() =>
			createConsent({ mode: 'opt-in', rev: 1 }, { root: {} as ConsentWindow, ui: false })
		).not.toThrow();
	});
});
