// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConsent, type ConsentWindow } from './consent.ts';
import { activateScripts, applyGrants, type SignalTarget } from './signals.ts';
import { holdTrackers, KNOWN_TRACKERS, stopHolding, trackerCategory } from './trackers.ts';
import { ALL_GRANTED, NONE_GRANTED } from './types.ts';

const BASE = 'https://shop.example/page';
const HOTJAR = 'https://static.hotjar.com/c/hotjar-1.js?sv=6';
const CLARITY = 'https://www.clarity.ms/tag/abc';
const LINKEDIN = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
const w = () => ({ document }) as SignalTarget;
const flush = () => new Promise((r) => setTimeout(r, 0));
const scripts = () => Array.from(document.querySelectorAll('script'));
const running = (url: string) => scripts().filter((s) => s.getAttribute('src') === url);

// happy-dom never downloads or runs scripts here; count a released one as loaded, not an error.
beforeEach(() => {
	const hd = (window as unknown as { happyDOM?: { settings: Record<string, unknown> } }).happyDOM;
	if (hd) hd.settings.handleDisabledFileLoadingAsSuccess = true;
});
afterEach(() => {
	vi.restoreAllMocks();
	stopHolding(w());
	document.head.innerHTML = '';
	document.body.innerHTML = '';
});

describe('trackerCategory', () => {
	it('matches hosts, subdomains and path prefixes', () => {
		expect(trackerCategory(HOTJAR, BASE)).toBe('analytics');
		expect(trackerCategory(CLARITY, BASE)).toBe('analytics');
		expect(trackerCategory('//static.hotjar.com/c/x.js', BASE)).toBe('analytics');
		expect(trackerCategory(LINKEDIN, BASE)).toBe('marketing');
		expect(trackerCategory('https://s.pinimg.com/ct/core.js', BASE)).toBe('marketing');
		expect(trackerCategory('https://s.pinimg.com/images/x.js', BASE)).toBeNull();
		expect(trackerCategory('https://sc-static.net/scevent.min.js', BASE)).toBe('marketing');
		expect(trackerCategory('https://www.redditstatic.com/ads/pixel.js', BASE)).toBe('marketing');
	});
	it('never matches look-alikes, relative, invalid or non-http URLs', () => {
		expect(trackerCategory('https://notclarity.ms/tag/x', BASE)).toBeNull();
		expect(trackerCategory('https://clarity.ms.evil.test/tag/x', BASE)).toBeNull();
		expect(trackerCategory('/js/app.js', BASE)).toBeNull();
		expect(trackerCategory('http://[bad', BASE)).toBeNull();
		expect(trackerCategory('data:text/javascript,1', BASE)).toBeNull();
		expect(trackerCategory('https://www.googletagmanager.com/gtag/js?id=G-1', BASE)).toBeNull();
	});
	it('adds the owner hosts, including their own site and pasted full URLs', () => {
		const extra = { analytics: ['stats.shop.example/js/'], marketing: ['https://ads.test'] };
		expect(trackerCategory('/js/matomo.js', 'https://stats.shop.example/', extra)).toBe(
			'analytics'
		);
		expect(trackerCategory('https://cdn.ads.test/p.js', BASE, extra)).toBe('marketing');
		expect(trackerCategory('https://ads.test/p.js', BASE, { marketing: [1 as unknown as string, ''] })).toBeNull(); // prettier-ignore
	});
	it('lists no preference trackers and no vendors that have consent signals', () => {
		const all = Object.values(KNOWN_TRACKERS).flat().join(' ');
		expect(KNOWN_TRACKERS.preferences).toEqual([]);
		expect(all).not.toMatch(/google|facebook|tiktok|bing|posthog/);
	});
});

describe('holdTrackers', () => {
	it('holds a createElement tracker without ever setting its URL, then restores it in place', () => {
		holdTrackers(w(), NONE_GRANTED);
		const s = document.createElement('script');
		s.async = true;
		s.src = CLARITY;
		s.type = 'text/javascript';
		document.head.appendChild(s);
		expect(s.getAttribute('src')).toBeNull();
		expect(s.getAttribute('type')).toBe('text/plain');
		expect(s.dataset).toMatchObject({ consent: 'analytics', src: CLARITY, type: 'text/javascript' }); // prettier-ignore
		expect(s.src).toBe(CLARITY);
		holdTrackers(w(), { ...NONE_GRANTED, marketing: true });
		expect(running(CLARITY)).toHaveLength(0);
		holdTrackers(w(), ALL_GRANTED);
		holdTrackers(w(), ALL_GRANTED);
		expect(running(CLARITY)).toEqual([s]);
		expect(s.type).toBe('text/javascript');
		expect(s.async).toBe(true);
		for (const a of ['data-wlc-held', 'data-consent', 'data-src', 'data-type'])
			expect(s.hasAttribute(a)).toBe(false);
	});
	it('traps setAttribute too, and lets other scripts through untouched', () => {
		holdTrackers(w(), NONE_GRANTED);
		const t = document.createElement('script');
		t.setAttribute('src', LINKEDIN);
		t.setAttribute('type', 'module');
		const own = document.createElement('script');
		own.src = 'https://shop.example/app.js';
		document.body.append(t, own);
		expect(t.getAttribute('src')).toBeNull();
		expect(t.dataset).toMatchObject({ consent: 'marketing', type: 'module' });
		expect(own.getAttribute('src')).toBe('https://shop.example/app.js');
		expect(own.hasAttribute('data-consent')).toBe(false);
	});
	it('does not hold when the category is already allowed', () => {
		holdTrackers(w(), ALL_GRANTED);
		const s = document.createElement('script');
		s.src = HOTJAR;
		expect(s.getAttribute('src')).toBe(HOTJAR);
	});
	it('releases a held script that was never added by restoring it in place', () => {
		holdTrackers(w(), NONE_GRANTED);
		const s = document.createElement('script');
		s.src = HOTJAR;
		holdTrackers(w(), ALL_GRANTED);
		expect(s.getAttribute('src')).toBe(HOTJAR);
		expect(s.hasAttribute('type')).toBe(false);
		expect(s.hasAttribute('data-wlc-held')).toBe(false);
	});
	it('holds trackers that arrive without createElement (parsed HTML)', async () => {
		holdTrackers(w(), NONE_GRANTED);
		document.body.innerHTML = `<div><script src="${HOTJAR}"></script></div><script src="/app.js"></script>`;
		await flush();
		const [hot, app] = scripts();
		expect(hot?.getAttribute('src')).toBeNull();
		expect(hot?.dataset).toMatchObject({ consent: 'analytics', src: HOTJAR });
		expect(app?.getAttribute('src')).toBe('/app.js');
		holdTrackers(w(), ALL_GRANTED);
		await flush();
		expect(running(HOTJAR)).toHaveLength(1);
	});
	it('activateScripts never runs a held tracker a second time', () => {
		holdTrackers(w(), NONE_GRANTED);
		const s = document.createElement('script');
		s.src = HOTJAR;
		document.head.appendChild(s);
		applyGrants(w(), ALL_GRANTED, {}, { event: false });
		activateScripts(document, ALL_GRANTED);
		expect(running(HOTJAR)).toHaveLength(1);
	});
	it('releases even when scriptBlocking is off', () => {
		applyGrants(w(), NONE_GRANTED, { scriptBlocking: false }, { event: false });
		const s = document.createElement('script');
		s.src = HOTJAR;
		document.head.appendChild(s);
		applyGrants(w(), ALL_GRANTED, { scriptBlocking: false }, { event: false });
		expect(running(HOTJAR)).toHaveLength(1);
	});
	it('holds the owner blockScripts hosts', () => {
		applyGrants(
			w(),
			NONE_GRANTED,
			{},
			{ event: false, blockScripts: { marketing: ['px.ads.test'] } }
		);
		const s = document.createElement('script');
		s.src = 'https://px.ads.test/p.js';
		expect(s.dataset.consent).toBe('marketing');
	});
	it('stops: restores createElement, stops watching and runs what it held', async () => {
		const before = document.createElement;
		holdTrackers(w(), NONE_GRANTED);
		expect(document.createElement).not.toBe(before);
		const s = document.createElement('script');
		s.src = HOTJAR;
		document.head.appendChild(s);
		applyGrants(w(), NONE_GRANTED, { knownTrackers: false }, { event: false });
		expect(document.createElement).toBe(before);
		expect(running(HOTJAR)).toHaveLength(1);
		const later = document.createElement('script');
		later.src = CLARITY;
		expect(later.getAttribute('src')).toBe(CLARITY);
		document.body.innerHTML = `<script src="${LINKEDIN}"></script>`;
		await flush();
		expect(running(LINKEDIN)).toHaveLength(1);
	});
	it('installs once and leaves a later wrapper of createElement in place on stop', () => {
		holdTrackers(w(), NONE_GRANTED);
		const ours = document.createElement;
		holdTrackers(w(), NONE_GRANTED);
		expect(document.createElement).toBe(ours);
		const theirs = function (this: Document, ...a: Parameters<Document['createElement']>) {
			return ours.apply(this, a);
		} as Document['createElement'];
		document.createElement = theirs;
		stopHolding(w());
		expect(document.createElement).toBe(theirs);
		const s = document.createElement('script');
		s.src = HOTJAR;
		expect(s.getAttribute('src')).toBe(HOTJAR); // our hook passes through once stopped
		delete (document as Partial<Document>).createElement;
	});
	it('warns once and fails open when a script property cannot be trapped', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const native = document.createElement;
		// Another tool got there first and locked `src` on every new script.
		document.createElement = function (this: Document, ...args: Parameters<Document['createElement']>) {
			const el = native.apply(this, args);
			let v = '';
			Object.defineProperty(el, 'src', { configurable: false, get: () => v, set: (x: string) => { v = x; el.setAttribute('src', x); } });
			return el;
		} as Document['createElement']; // prettier-ignore
		holdTrackers(w(), NONE_GRANTED);
		const a = document.createElement('script');
		document.createElement('script');
		a.src = HOTJAR;
		expect(a.getAttribute('src')).toBe(HOTJAR);
		expect(warn).toHaveBeenCalledTimes(1);
		stopHolding(w());
		delete (document as Partial<Document>).createElement;
		warn.mockRestore();
	});
	it('does nothing without a document', () => {
		expect(() => holdTrackers({}, NONE_GRANTED)).not.toThrow();
		expect(() => stopHolding({})).not.toThrow();
	});
});

describe('consent manager wiring', () => {
	const root = (): ConsentWindow =>
		({
			document,
			location: { pathname: '/', protocol: 'https:' },
			navigator: { languages: ['en'] },
			innerWidth: 1440
		}) as unknown as ConsentWindow;
	it('holds in ask-first mode until Accept, with the owner hosts', async () => {
		const m = createConsent(
			{ mode: 'opt-in', rev: 1, blockScripts: { analytics: ['stats.test'] } },
			{ root: root(), ui: false }
		);
		const a = document.createElement('script');
		a.src = 'https://stats.test/s.js';
		document.head.appendChild(a);
		expect(a.dataset.consent).toBe('analytics');
		m.rejectAll();
		await flush();
		expect(running('https://stats.test/s.js')).toHaveLength(0);
		m.acceptAll();
		await flush();
		expect(running('https://stats.test/s.js')).toHaveLength(1);
		m.destroy();
	});
	it('lets trackers run straight away in opt-out mode', () => {
		const m = createConsent({ mode: 'opt-out', rev: 1 }, { root: root(), ui: false });
		const s = document.createElement('script');
		s.src = HOTJAR;
		expect(s.getAttribute('src')).toBe(HOTJAR);
		m.destroy();
	});
});

describe('activateScripts (owner tags)', () => {
	it('runs the owner tagged scripts once, keeping their attributes', () => {
		document.head.innerHTML =
			'<script type="text/plain" data-consent="analytics" data-src="/a.js" data-type="module" id="a" async></script>' +
			'<script type="text/plain" data-consent="analytics marketing">window.x = 1</script>';
		activateScripts(document, { ...NONE_GRANTED, analytics: true });
		activateScripts(document, { ...NONE_GRANTED, analytics: true });
		const run = running('/a.js');
		expect(run).toHaveLength(1);
		expect(run[0]).toMatchObject({ type: 'module', async: true });
		expect(run[0]?.hasAttribute('data-src')).toBe(false);
		expect(scripts()).toHaveLength(3); // the inline one waits for marketing too
		activateScripts(document, ALL_GRANTED);
		expect(scripts().at(-1)?.text).toBe('window.x = 1');
	});
});
