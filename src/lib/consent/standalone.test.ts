import { describe, expect, it } from 'vitest';
import { createConsent, type ConsentWindow } from './consent.ts';
import { hostedDefaults, loadHosted } from './standalone.ts';
import type { ConsentConfig } from './types.ts';

const ok = (body: unknown) =>
	(async () => ({ ok: true, json: async () => body })) as unknown as typeof fetch;

describe('hosted install', () => {
	it('fetches the config from the script origin without cookies', async () => {
		const calls: { url: string; init?: RequestInit }[] = [];
		const f = (async (url: string, init?: RequestInit) => {
			calls.push({ url, init });
			return { ok: true, json: async () => ({ mode: 'opt-in', rev: 3, endpoints: { record: 'https://example.test/api/consent' } }) };
		}) as unknown as typeof fetch; // prettier-ignore
		const c = await loadHosted('site_1', 'https://example.test/consent/welovecookies.min.js', f);
		expect(calls[0]?.url).toBe('https://example.test/api/consent/config?site=site_1');
		expect(calls[0]?.init).toMatchObject({ credentials: 'omit', mode: 'cors' });
		expect(c).toMatchObject({ mode: 'opt-in', rev: 3, site: 'site_1' });
	});
	it('falls back to auto mode with no endpoints on failure', async () => {
		const bad = (async () => { throw new Error('offline'); }) as unknown as typeof fetch; // prettier-ignore
		for (const f of [bad, ok(null), ok('x'), undefined]) {
			const c = await loadHosted('s', 'https://example.test/x.js', f);
			expect(c).toEqual({ mode: 'auto', rev: 1, floatingButton: true, site: 's' });
		}
	});
	it('sets denied defaults right away', () => {
		const w: Record<string, unknown> = {};
		hostedDefaults(w);
		const dl = w.dataLayer as IArguments[];
		expect(Array.from(dl[0] ?? [])).toMatchObject(['consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied' }]); // prettier-ignore
		expect(w.uetq).toEqual(['consent', 'default', { ad_storage: 'denied' }]);
	});
	it('sends the site key in every payload, cross-origin with CORS and no cookies', async () => {
		const posts: { url: string; init: RequestInit }[] = [];
		const f = (async (url: string, init: RequestInit) => {
			posts.push({ url, init });
			return { ok: true, json: async () => ({}) };
		}) as unknown as typeof fetch;
		let jarv = '';
		const w: ConsentWindow = {
			document: { get cookie() { return jarv; }, set cookie(v: string) { jarv = v.split(';')[0] ?? ''; }, body: null, addEventListener() {} } as unknown as Document,
			location: { pathname: '/', protocol: 'https:', hostname: 'localhost', origin: 'https://other.test' },
			navigator: { languages: ['en'] },
			innerWidth: 1440
		}; // prettier-ignore
		const cfg: ConsentConfig = {
			mode: 'opt-in',
			rev: 1,
			site: 'site_1',
			endpoints: {
				record: 'https://example.test/api/consent',
				seen: 'https://example.test/api/consent/seen'
			}
		};
		const m = createConsent(cfg, { root: w, fetch: f, ui: false });
		m.showBanner();
		m.acceptAll();
		await new Promise((r) => setTimeout(r, 5));
		expect(posts).toHaveLength(2);
		for (const p of posts) {
			expect(JSON.parse(String(p.init.body)).site).toBe('site_1');
			expect(p.init).toMatchObject({ credentials: 'omit', mode: 'cors' });
			expect(p.init.keepalive).toBeUndefined();
			expect(p.init.headers).toEqual({ 'content-type': 'application/json' });
		}
	});
});
