/**
 * The consent manager: resolves the mode, reads/writes the cookie, applies vendor signals,
 * shows the UI, logs choices. Never throws into the page; never blocks the UI on the network.
 */
import { clearOff, rootCandidates } from './autoclear.ts';
import {
	decodeConsent,
	encodeConsent,
	newConsentId,
	newestConsent,
	readCookies
} from './cookie.ts';
import { deviceOf } from './device.ts';
import { isRtl, pickLanguage, textsFor } from './i18n.ts';
import { bannerFor, effectiveGrants, isCurrent, MODE_RULES, modeFromTimeZone } from './regions.ts';
import { applyDefaults, applyGrants, type PostHogLike, type SignalTarget } from './signals.ts';
import {
	ALL_GRANTED,
	CONSENT_COOKIE_NAME,
	NONE_GRANTED,
	type ConsentAction,
	type ConsentConfig,
	type ConsentMode,
	type ConsentRecordPayload,
	type ConsentSeenPayload,
	type Device,
	type Grants,
	type StoredConsent
} from './types.ts';
import { createUi, type Ui } from './ui.ts';

export interface ConsentState {
	mode: ConsentMode;
	grants: Grants;
	stored: StoredConsent | null;
	gpc: boolean;
	lang: string;
	device: Device;
}
export interface ConsentManager {
	get(): ConsentState;
	onChange(cb: (s: ConsentState) => void): () => void;
	acceptAll(): void;
	rejectAll(): void;
	save(grants: Grants): void;
	acknowledge(): void;
	openPreferences(): void;
	showBanner(): void;
	destroy(): void;
}
/** The window bits the manager touches; tests pass a fake. */
export type ConsentWindow = SignalTarget & {
	document: Document;
	location: { pathname: string; protocol: string; hostname?: string; origin?: string };
	localStorage?: Storage;
	sessionStorage?: Storage;
	navigator: {
		languages?: readonly string[];
		language?: string;
		userAgent?: string;
		maxTouchPoints?: number;
		globalPrivacyControl?: boolean;
	};
	innerWidth: number;
	dispatchEvent?(e: Event): boolean;
	CustomEvent?: typeof CustomEvent;
};
export interface ConsentOptions {
	posthog?: PostHogLike | null;
	/** Window-like root (default: the global window). */
	root?: ConsentWindow;
	now?: () => number;
	fetch?: typeof fetch;
	/** Set false to skip the DOM UI (headless use, tests). */
	ui?: boolean;
	/** Time zone for mode 'auto' (default: Intl). */
	timeZone?: string;
}

const NOOP: ConsentManager = {
	get: () => ({ mode: 'opt-in', grants: { ...NONE_GRANTED }, stored: null, gpc: false, lang: 'en', device: 'desktop' }),
	onChange: () => () => {},
	acceptAll() {}, rejectAll() {}, save() {}, acknowledge() {}, openPreferences() {}, showBanner() {}, destroy() {}
}; // prettier-ignore

const guard =
	<A extends unknown[]>(f: (...a: A) => void) =>
	(...a: A) => {
		try {
			f(...a);
		} catch (e) {
			console.error('[ecom-cookie]', e);
		}
	};

export function createConsent(config: ConsentConfig, options: ConsentOptions = {}): ConsentManager {
	try {
		return create(config, options);
	} catch (e) {
		console.error('[ecom-cookie]', e);
		return NOOP;
	}
}

function create(config: ConsentConfig, o: ConsentOptions): ConsentManager {
	const w = o.root ?? (globalThis as unknown as ConsentWindow);
	const doc = w.document;
	const now = o.now ?? Date.now;
	const doFetch = o.fetch ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : undefined);
	const nav = w.navigator ?? {};
	const name = config.cookieName ?? CONSENT_COOKIE_NAME;
	let tz = o.timeZone;
	if (!tz && config.mode === 'auto')
		try {
			tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		} catch {
			tz = '';
		}
	const mode: ConsentMode = config.mode === 'auto' ? modeFromTimeZone(tz) : config.mode;
	const rule = MODE_RULES[mode];
	const gpc = config.gpc === true || nav.globalPrivacyControl === true;
	const lang = pickLanguage(nav.languages ?? (nav.language ? [nav.language] : []), config.lang);
	const device = deviceOf(w.innerWidth ?? 1024, nav.userAgent ?? '', nav.maxTouchPoints ?? 0);
	const path = w.location?.pathname ?? '/';
	const compact = (config.compactOn ?? []).some((p) => path.startsWith(p));
	const int = config.integrations ?? {};
	const posthog = () => o.posthog ?? w.posthog;
	const listeners = new Set<(s: ConsentState) => void>();

	let stored = newestConsent(readCookies(doc.cookie ?? '', name));
	let grants = effectiveGrants(mode, stored, config.rev, gpc, now());
	let seenSent = false;
	let destroyed = false;

	const state = (): ConsentState => ({
		mode,
		grants: { ...grants },
		stored: stored && { ...stored, grants: { ...stored.grants } },
		gpc,
		lang,
		device
	});
	const post = (url: string | undefined, body: unknown) => {
		if (!url || !doFetch) return Promise.resolve(null);
		const origin = w.location?.origin;
		const same =
			!/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url) || (!!origin && url.startsWith(`${origin}/`));
		// Cross-origin (hosted install): CORS with a preflight, no cookies, no keepalive.
		return doFetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
			...(same
				? { keepalive: true, credentials: 'same-origin' as const }
				: { credentials: 'omit' as const, mode: 'cors' as const })
		})
			.then((r) => (r.ok ? r.json() : null))
			.catch(() => null);
	};
	const host = w.location?.hostname ?? '';
	let domain: string | null | undefined; // undefined = not looked up yet, null = host-only
	const cookieDomain = (): string | null => {
		if (domain !== undefined) return domain;
		domain = null;
		const want = config.cookieDomain ?? 'auto';
		if (want !== 'auto') return (domain = want || null);
		const probe = `${name}_probe`;
		for (const d of rootCandidates(host)) {
			doc.cookie = `${probe}=1; path=/; domain=${d}; SameSite=Lax`;
			const ok = readCookies(doc.cookie ?? '', probe).length > 0;
			doc.cookie = `${probe}=; path=/; domain=${d}; max-age=0`;
			if (ok) return (domain = d);
		}
		return domain;
	};
	const clear = (g: Grants) => clearOff(w, g, config.autoClear, name);
	const writeCookie = (c: StoredConsent) => {
		const d = cookieDomain();
		// One copy only: drop a host-only copy before writing the domain one.
		if (d) doc.cookie = `${name}=; path=/; max-age=0`;
		const parts = [
			`${name}=${encodeConsent(c)}`,
			'path=/',
			'SameSite=Lax',
			`max-age=${MODE_RULES[c.mode].maxAgeDays * 86400}`
		];
		if (d) parts.push(`domain=${d}`);
		if (w.location?.protocol === 'https:') parts.push('Secure');
		doc.cookie = parts.join('; ');
	};
	const emit = () => {
		const s = state();
		try {
			const CE = w.CustomEvent ?? (typeof CustomEvent === 'function' ? CustomEvent : undefined);
			if (CE && w.dispatchEvent) w.dispatchEvent(new CE('ecom-cookie:change', { detail: s }));
		} catch {
			/* ignore */
		}
		for (const cb of listeners) guard(cb)(s);
	};
	const defer = (f: () => void) => setTimeout(guard(f), 0);

	let ui: Ui | null = null;
	const showFab = () =>
		ui?.floating(
			!!config.floatingButton && !compact && !!stored && isCurrent(stored, config.rev, now())
		);

	const choose = (action: ConsentAction, g: Grants, opts: { silent?: boolean } = {}) => {
		if (destroyed) return;
		const next: Grants = gpc ? { ...g, marketing: false } : { ...g };
		const hadAny = grants.analytics || grants.marketing || grants.preferences;
		const none = !next.analytics && !next.marketing && !next.preferences;
		if (action === 'custom' && none && hadAny && stored) action = 'withdraw';
		const c: StoredConsent = {
			id: stored?.id ?? newConsentId(),
			at: now(),
			mode,
			rev: config.rev,
			grants: next,
			action
		};
		stored = c;
		grants = { ...next };
		writeCookie(c);
		ui?.closePanel();
		ui?.banner(null);
		showFab();
		if (!opts.silent && action !== 'acknowledge') ui?.toast(texts.saved);
		const payload: ConsentRecordPayload = {
			id: c.id,
			action,
			grants: next,
			mode,
			rev: c.rev,
			lang,
			device,
			gpc,
			page: path,
			...(config.site ? { site: config.site } : {})
		};
		defer(() => {
			applyGrants(w, grants, int, { posthog: posthog() });
			clear(grants);
			emit();
			void post(config.endpoints?.record, payload).then((res) => {
				const fixed = decodeConsent(
					res && typeof res === 'object' && 'consent' in res && res.consent
						? encodeConsent(res.consent as StoredConsent)
						: null
				);
				if (!fixed || destroyed || fixed.id !== c.id) return;
				if (encodeConsent(fixed) === encodeConsent(c)) return;
				stored = fixed;
				grants = effectiveGrants(mode, fixed, config.rev, gpc, now());
				writeCookie(fixed);
				applyGrants(w, grants, int, { posthog: posthog() });
				clear(grants);
				emit();
			});
		});
	};

	const texts = textsFor(lang, config.texts);
	const showBannerKind = (kind: 'full' | 'notice' | null) => {
		ui?.banner(kind);
		if (kind && !seenSent) {
			seenSent = true;
			const seen: ConsentSeenPayload = {
				mode,
				device,
				lang,
				...(config.site ? { site: config.site } : {})
			};
			defer(() => void post(config.endpoints?.seen, seen));
		}
	};

	const m: ConsentManager = {
		get: state,
		onChange(cb) {
			listeners.add(cb);
			return () => listeners.delete(cb);
		},
		acceptAll: guard(() =>
			choose('accept_all', {
				...ALL_GRANTED,
				preferences: !!config.preferencesCategory || grants.preferences
			})
		),
		rejectAll: guard(() => choose('reject_all', { ...NONE_GRANTED })),
		save: guard((g: Grants) =>
			choose('custom', {
				preferences: !!g.preferences,
				analytics: !!g.analytics,
				marketing: !!g.marketing
			})
		),
		acknowledge: guard(() => choose('acknowledge', { ...grants })),
		openPreferences: guard(() => {
			const current = stored && isCurrent(stored, config.rev, now());
			ui?.panel(rule.optIn && !current ? { ...NONE_GRANTED } : grants);
		}),
		showBanner: guard(() =>
			showBannerKind(rule.banner === 'none' ? 'notice' : rule.optIn ? 'full' : 'notice')
		),
		destroy: guard(() => {
			destroyed = true;
			listeners.clear();
			ui?.destroy();
			ui = null;
		})
	};

	// Signals first, before any vendor tag runs.
	applyDefaults(
		w,
		rule.defaults.marketing && gpc ? { ...rule.defaults, marketing: false } : rule.defaults,
		int
	);
	const hasChoice = !!stored && isCurrent(stored, config.rev, now());
	applyGrants(w, grants, int, {
		posthog: posthog(),
		pending: !hasChoice && rule.optIn,
		event: hasChoice
	});
	guard(clear)(grants);

	const mount = () => {
		if (destroyed) return;
		if (o.ui !== false && doc.body)
			ui = createUi(
				doc,
				config,
				{ texts, lang, rtl: isRtl(lang), gpc, doNotSell: rule.doNotSellLink, compact },
				{
					acceptAll: m.acceptAll,
					rejectAll: m.rejectAll,
					acknowledge: m.acknowledge,
					save: m.save,
					openPreferences: m.openPreferences
				}
			);
		if (gpc && !rule.optIn && !hasChoice) {
			choose('gpc', grants, { silent: true });
		} else {
			showBannerKind(
				bannerFor(mode, stored, config.rev, { gpc, noticeBanner: config.noticeBanner }, now())
			);
			showFab();
		}
	};
	// Signals are set above immediately; the UI waits for <body> when loaded from <head>.
	if (o.ui === false || doc.body) mount();
	else doc.addEventListener('DOMContentLoaded', guard(mount), { once: true });
	return m;
}
