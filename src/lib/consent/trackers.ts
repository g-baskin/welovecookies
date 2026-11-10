/**
 * Hold well-known trackers that other code adds after the banner loaded (a tag manager, a plugin)
 * until their category is allowed. A matching `<script>` becomes the shape `activateScripts`
 * already understands: `type="text/plain"`, `data-consent`, the URL in `data-src`. The URL is never
 * set on a held script, so a script made with `createElement` makes no request before consent.
 */
import type { SignalTarget } from './signals.ts';
import { OPTIONAL_CATEGORIES, type Grants, type OptionalCategory } from './types.ts';

/**
 * `host` (subdomains included) or `host/path-prefix`, per category. Keep in step with AUTO_CLEAR.
 * Google, Meta, TikTok, Microsoft UET and PostHog are left out on purpose: their consent signals
 * already control them, and holding gtag would turn Google's advanced consent mode into basic.
 */
export const KNOWN_TRACKERS: Record<OptionalCategory, readonly string[]> = {
	preferences: [],
	analytics: [
		'static.hotjar.com', 'script.hotjar.com', // Hotjar
		'clarity.ms', // Microsoft Clarity
		'cdn.mxpnl.com', // Mixpanel
		'cdn.segment.com', // Segment
		'cdn.matomo.cloud' // Matomo Cloud
	],
	marketing: [
		'snap.licdn.com', // LinkedIn Insight
		's.pinimg.com/ct/', // Pinterest
		'sc-static.net/scevent', // Snap
		'redditstatic.com/ads/', // Reddit
		'static.ads-twitter.com' // X (Twitter)
	]
}; // prettier-ignore

type Extra = Partial<Record<OptionalCategory, string[]>>;

function matches(entry: unknown, host: string, path: string): boolean {
	if (typeof entry !== 'string') return false;
	const e = entry
		.trim()
		.toLowerCase()
		.replace(/^([a-z][a-z0-9+.-]*:)?\/\//, '');
	const i = e.indexOf('/');
	const h = i < 0 ? e : e.slice(0, i);
	if (!h) return false;
	return (host === h || host.endsWith(`.${h}`)) && path.startsWith(i < 0 ? '' : e.slice(i));
}

/** The category a script URL belongs to, or null. Relative URLs resolve against `baseHref`. */
export function trackerCategory(
	url: string,
	baseHref: string,
	extra: Extra = {}
): OptionalCategory | null {
	let u: URL;
	try {
		u = new URL(url, baseHref);
	} catch {
		return null;
	}
	if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
	const host = u.hostname.toLowerCase();
	const path = u.pathname.toLowerCase();
	for (const c of OPTIONAL_CATEGORIES) {
		const own = extra?.[c];
		const list = [...KNOWN_TRACKERS[c], ...(Array.isArray(own) ? own : [])];
		if (list.some((e) => matches(e, host, path))) return c;
	}
	return null;
}

interface Holder {
	active: boolean;
	grants: Grants;
	extra: Extra;
	held: Set<HTMLScriptElement>;
	original: Document['createElement'];
	hadOwn: boolean;
	hooked: Document['createElement'];
	observer: MutationObserver | null;
	warned: boolean;
}

const KEY = Symbol.for('welovecookies.trackers');
const HELD = 'data-wlc-held';
type Keyed = Document & { [KEY]?: Holder };

const safe = (f: () => void) => {
	try {
		f();
	} catch {
		/* holding is a safety net: it must never break the page */
	}
};
const RUNNABLE = /^$|^module$|javascript|ecmascript|jscript|livescript/;

function descriptor(o: object, name: string): PropertyDescriptor | undefined {
	for (let p: object | null = o; p; p = Object.getPrototypeOf(p)) {
		const d = Object.getOwnPropertyDescriptor(p, name);
		if (d) return d;
	}
	return undefined;
}

/** The page's own setAttribute, past any trap we put on the element. */
function setNative(el: Element, name: string, value: string) {
	(descriptor(Object.getPrototypeOf(el), 'setAttribute')?.value as Element['setAttribute']).call(
		el,
		name,
		value
	);
}

function categoryFor(st: Holder, doc: Document, url: string): OptionalCategory | null {
	const c = trackerCategory(url, doc.baseURI, st.extra);
	return c && st.grants[c] !== true ? c : null;
}

function hold(el: HTMLScriptElement, url: string, cat: OptionalCategory, st: Holder) {
	const type = el.getAttribute('type');
	if (type && type.trim().toLowerCase() !== 'text/plain') setNative(el, 'data-type', type);
	setNative(el, 'type', 'text/plain');
	setNative(el, 'data-consent', cat);
	setNative(el, 'data-src', url);
	setNative(el, HELD, '');
	el.removeAttribute('src');
	st.held.add(el);
}

/**
 * Put a held script back as it was, in place. Setting `src` again runs it only if the browser would
 * have: a script from innerHTML stays "already started" and never runs, unlike a fresh clone.
 */
function unhold(el: HTMLScriptElement) {
	const src = el.getAttribute('data-src');
	const type = el.getAttribute('data-type');
	for (const a of ['data-src', 'data-type', 'data-consent', HELD, 'type']) el.removeAttribute(a);
	if (type) setNative(el, 'type', type);
	if (src) setNative(el, 'src', src);
}

function release(st: Holder, all: boolean) {
	for (const el of Array.from(st.held)) {
		const cat = el.getAttribute('data-consent') as OptionalCategory | null;
		if (!all && !(cat && st.grants[cat] === true)) continue;
		st.held.delete(el);
		safe(() => unhold(el));
	}
}

/** Give one `<script>` from createElement instance-level `src`, `type` and `setAttribute` traps. */
function wrap(el: HTMLScriptElement, doc: Document, st: Holder) {
	const src = descriptor(el, 'src');
	const type = descriptor(el, 'type');
	const setAttr = el.setAttribute;
	const trap = (url: string) => {
		if (!st.active) return false;
		if (st.held.has(el)) {
			setNative(el, 'data-src', url);
			return true;
		}
		const cat = categoryFor(st, doc, url);
		if (cat) hold(el, url, cat, st);
		return !!cat;
	};
	try {
		if (!src?.get || !src.set || !type?.get || !type.set) throw new Error('no accessors');
		Object.defineProperty(el, 'src', {
			configurable: true,
			get: () =>
				st.held.has(el)
					? new URL(el.getAttribute('data-src') ?? '', doc.baseURI).href
					: src.get!.call(el),
			set: (v: unknown) => {
				if (!trap(String(v))) src.set!.call(el, v);
			}
		});
		Object.defineProperty(el, 'type', {
			configurable: true,
			get: () => type.get!.call(el),
			set: (v: unknown) => {
				if (st.held.has(el)) setAttr.call(el, 'data-type', String(v));
				else type.set!.call(el, v);
			}
		});
		Object.defineProperty(el, 'setAttribute', {
			configurable: true,
			writable: true,
			value(name: string, value: string) {
				const n = String(name).toLowerCase();
				if (n === 'src' && trap(String(value))) return;
				if (n === 'type' && st.held.has(el)) return setAttr.call(el, 'data-type', String(value));
				return setAttr.call(el, name, value);
			}
		});
	} catch {
		if (st.warned) return;
		st.warned = true;
		console.warn('[welovecookies] could not watch a script tag; known trackers may not be held');
	}
}

function watch(node: Node, doc: Document, st: Holder) {
	if (node.nodeType !== 1) return;
	const el = node as Element;
	const list =
		el.tagName.toUpperCase() === 'SCRIPT'
			? [el as HTMLScriptElement]
			: el.querySelectorAll('script[src]');
	for (const s of Array.from(list) as HTMLScriptElement[]) {
		const url = s.getAttribute('src');
		const type = (s.getAttribute('type') ?? '').trim().toLowerCase();
		if (!url || s.hasAttribute(HELD) || !RUNNABLE.test(type)) continue;
		const cat = categoryFor(st, doc, url);
		if (cat) hold(s, url, cat, st);
	}
}

function install(doc: Keyed): Holder {
	const original = doc.createElement;
	const st: Holder = {
		active: true,
		grants: { preferences: false, analytics: false, marketing: false },
		extra: {},
		held: new Set(),
		original,
		hadOwn: Object.prototype.hasOwnProperty.call(doc, 'createElement'),
		hooked: original,
		observer: null,
		warned: false
	};
	st.hooked = function (this: Document, ...args: Parameters<Document['createElement']>) {
		const el = original.apply(this, args);
		if (st.active && typeof args[0] === 'string' && args[0].toLowerCase() === 'script')
			safe(() => wrap(el as HTMLScriptElement, doc, st));
		return el;
	} as Document['createElement'];
	doc.createElement = st.hooked;
	const MO = doc.defaultView?.MutationObserver ?? globalThis.MutationObserver;
	if (typeof MO === 'function') {
		st.observer = new MO((records) => {
			for (const r of records)
				for (const n of Array.from(r.addedNodes)) safe(() => watch(n, doc, st));
		});
		st.observer.observe(doc, { childList: true, subtree: true });
	}
	doc[KEY] = st;
	return st;
}

/**
 * Start (once per document) or update holding with the current grants, and release held scripts
 * whose category is now allowed. Safe to call on every grants change.
 */
export function holdTrackers(w: SignalTarget, grants: Grants, extra: Extra = {}): void {
	const doc = w.document as Keyed | undefined;
	if (!doc || typeof doc.createElement !== 'function') return;
	safe(() => {
		const st = doc[KEY] ?? install(doc);
		st.grants = { ...grants };
		st.extra = extra ?? {};
		release(st, false);
	});
}

/** Stop holding: unhook, stop watching and release every script held so far. */
export function stopHolding(w: SignalTarget): void {
	const doc = w.document as Keyed | undefined;
	const st = doc?.[KEY];
	if (!doc || !st) return;
	safe(() => {
		st.active = false;
		st.observer?.disconnect();
		if (doc.createElement === st.hooked) {
			if (st.hadOwn) doc.createElement = st.original;
			else delete (doc as Partial<Document>).createElement;
		}
		delete doc[KEY];
		release(st, true);
	});
}
