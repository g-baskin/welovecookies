import { describe, expect, it } from 'vitest';
import {
	clearOff,
	deletionStrings,
	matchesPattern,
	namesToClear,
	patternsFor,
	rootCandidates
} from './autoclear.ts';
import { createConsent, type ConsentWindow } from './consent.ts';
import { encodeConsent, newestConsent, readCookies } from './cookie.ts';
import { ALL_GRANTED, NONE_GRANTED, type ConsentConfig, type StoredConsent } from './types.ts';

/** A cookie jar that understands max-age=0 and domain (enough for these tests). */
function jar(initial: Record<string, string> = {}, refuse: (d: string) => boolean = () => false) {
	const m = new Map<string, string>(Object.entries(initial));
	const writes: string[] = [];
	const doc = {
		get cookie() {
			return [...m].map(([k, v]) => `${k.split('|')[0]}=${v}`).join('; ');
		},
		set cookie(s: string) {
			writes.push(s);
			const [nv = '', ...attrs] = s.split(';').map((x) => x.trim());
			const i = nv.indexOf('=');
			const n = nv.slice(0, i);
			const dom = attrs
				.find((a) => a.startsWith('domain='))
				?.slice(7)
				.replace(/^\./, '');
			if (dom && refuse(dom)) return;
			const key = `${n}|${dom ?? ''}`;
			if (attrs.includes('max-age=0')) {
				m.delete(key);
				if (!dom) m.delete(n);
			} else m.set(key, nv.slice(i + 1));
		},
		body: null,
		addEventListener() {}
	};
	return { doc, m, writes };
}
function store() {
	const m = new Map<string, string>();
	return {
		m,
		get length() { return m.size; },
		key: (i: number) => [...m.keys()][i] ?? null,
		removeItem: (k: string) => void m.delete(k),
		setItem: (k: string, v: string) => void m.set(k, v)
	}; // prettier-ignore
}

describe('auto-clear helpers', () => {
	it('matches exact names and * prefixes', () => {
		expect(matchesPattern('_ga', ['_ga'])).toBe(true);
		expect(matchesPattern('_ga_ABC', ['_ga'])).toBe(false);
		expect(matchesPattern('_ga_ABC', ['_ga_*'])).toBe(true);
		expect(matchesPattern('ph_phc_x_posthog', ['ph_*'])).toBe(true);
		expect(matchesPattern('eb_cart', ['ph_*', '_fbp'])).toBe(false);
	});
	it('lists only off categories, plus owner extras, and never the choice cookie', () => {
		const p = patternsFor({ ...ALL_GRANTED, marketing: false }, { marketing: ['my_ad*'] });
		expect(p).toContain('_fbp');
		expect(p).toContain('my_ad*');
		expect(p).not.toContain('_ga');
		expect(namesToClear('_fbp=1; _ga=2; eb_cc=x; my_ad1=3', [...p, 'eb_*'], 'eb_cc')).toEqual([
			'_fbp',
			'my_ad1'
		]);
	});
	it('builds root candidates shortest first and skips local hosts', () => {
		expect(rootCandidates('shop.example.co.uk')).toEqual([
			'co.uk',
			'example.co.uk',
			'shop.example.co.uk'
		]);
		expect(rootCandidates('localhost')).toEqual([]);
		expect(rootCandidates('127.0.0.1')).toEqual([]);
		expect(rootCandidates('[::1]')).toEqual([]);
	});
	it('deletes for both paths, host-only and every parent domain with and without a dot', () => {
		const d = deletionStrings('_ga', 'a.example.com', '/p');
		expect(d).toHaveLength(2 * (1 + 2 * 2));
		expect(d).toContain('_ga=; path=/p; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT');
		expect(d.some((s) => s.endsWith('domain=.example.com'))).toBe(true);
		expect(d.some((s) => s.endsWith('domain=a.example.com'))).toBe(true);
	});
	it('clears storage keys too', () => {
		const j = jar({ _ga: '1', eb_cc: 'x' });
		const ls = store();
		ls.setItem('ph_phc_abc_posthog', '{}');
		ls.setItem('cart', '1');
		clearOff({ document: j.doc, location: { hostname: 'localhost', pathname: '/' }, localStorage: ls }, NONE_GRANTED, {}, 'eb_cc'); // prettier-ignore
		expect([...ls.m.keys()]).toEqual(['cart']);
		expect(j.doc.cookie).toBe('eb_cc=x');
	});
});

describe('choice cookie copies', () => {
	const c = (at: number, analytics: boolean): StoredConsent => ({
		id: 'k3J9x_aB2cD4eF6g', at, mode: 'opt-in', rev: 1, action: 'custom',
		grants: { preferences: false, analytics, marketing: false }
	}); // prettier-ignore
	it('reads every copy and picks the newest', () => {
		const h = `eb_cc=${encodeConsent(c(100, false))}; x=1; eb_cc=${encodeConsent(c(200, true))}; eb_cc=bad`;
		expect(readCookies(h, 'eb_cc')).toHaveLength(3);
		expect(newestConsent(readCookies(h, 'eb_cc'))?.grants.analytics).toBe(true);
		expect(newestConsent([])).toBeNull();
	});
});

function manager(cookies: Record<string, string>, over: Partial<ConsentConfig> = {}, hostname = 'shop.example.co.uk') {
	const j = jar(cookies, (d) => d === 'co.uk');
	const w: ConsentWindow = {
		document: j.doc as unknown as Document,
		location: { pathname: '/p', protocol: 'https:', hostname },
		navigator: { languages: ['en'] },
		innerWidth: 1440
	};
	const m = createConsent({ mode: 'opt-out', rev: 1, ...over }, { root: w, ui: false, now: () => 1e12 });
	return { j, m };
} // prettier-ignore
const tick = () => new Promise((r) => setTimeout(r, 5));

describe('manager auto-clear and domain', () => {
	it('turning a category off clears it; categories left on are kept', async () => {
		const t = manager({ _ga: '1', _fbp: '2', 'eb_cc|': 'old' });
		expect(t.j.doc.cookie).toContain('_ga=1'); // opt-out default: on, nothing cleared at start
		t.m.save({ preferences: false, analytics: true, marketing: false });
		await tick();
		expect(t.j.doc.cookie).toContain('_ga=1');
		expect(t.j.doc.cookie).not.toContain('_fbp');
	});
	it('clears once at start-up when the grants say off', () => {
		const t = manager({ _ga: '1', _fbp: '2' }, { mode: 'opt-in' });
		expect(t.j.doc.cookie).toBe('');
	});
	it('writes the choice on the root domain and removes a host-only copy', () => {
		const t = manager({ eb_cc: 'old' });
		t.m.acceptAll();
		const w = t.j.writes.filter((s) => s.startsWith('eb_cc='));
		expect(w[0]).toBe('eb_cc=; path=/; max-age=0');
		expect(w[1]).toMatch(/domain=example\.co\.uk/);
		expect(readCookies(t.j.doc.cookie, 'eb_cc')).toHaveLength(1);
		expect(t.j.doc.cookie).not.toContain('probe');
	});
	it('uses an explicit domain as given and host-only on localhost', () => {
		const a = manager({}, { cookieDomain: 'example.com' });
		a.m.acceptAll();
		expect(a.j.writes.at(-1)).toMatch(/domain=example\.com/);
		const b = manager({}, {}, 'localhost');
		b.m.acceptAll();
		expect(b.j.writes.at(-1)).not.toMatch(/domain=/);
	});
});
