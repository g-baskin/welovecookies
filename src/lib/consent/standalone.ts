/**
 * One-script-tag build: `window.EcomCookie`. Auto-inits from `window.EcomCookieConfig` or the
 * script tag's data-* attributes (data-mode, data-rev, data-lang, data-record, data-seen,
 * data-privacy, data-cookies-page, data-choices, data-position, data-floating, data-avoid,
 * data-preferences, data-auto="false" to skip). Default mode 'auto'. Signal defaults are set at once; the banner mounts when <body> exists.
 */
import { createConsent, type ConsentManager, type ConsentOptions } from './consent.ts';
import { applyDefaults, type SignalTarget } from './signals.ts';
import {
	HOSTED_CONFIG_PATH,
	NONE_GRANTED,
	type BannerPosition,
	type ConsentConfig
} from './types.ts';

type Api = Partial<ConsentManager> & {
	init(c?: Partial<ConsentConfig>, o?: ConsentOptions): ConsentManager;
};
declare global {
	interface Window {
		EcomCookie?: Api;
		EcomCookieConfig?: Partial<ConsentConfig>;
	}
}

/**
 * Hosted install (`data-site`): fetch this visitor's config from the store that serves the script.
 * Any failure gives a working banner with mode 'auto' and no logging.
 */
export async function loadHosted(
	site: string,
	scriptSrc: string,
	doFetch: typeof fetch | undefined
): Promise<ConsentConfig> {
	const fallback: ConsentConfig = { mode: 'auto', rev: 1, floatingButton: true, site };
	try {
		if (!doFetch) return fallback;
		const url = new URL(`${HOSTED_CONFIG_PATH}?site=${encodeURIComponent(site)}`, scriptSrc);
		const r = await doFetch(url.href, { credentials: 'omit', mode: 'cors' });
		if (!r.ok) return fallback;
		const c: unknown = await r.json();
		if (!c || typeof c !== 'object' || typeof (c as ConsentConfig).mode !== 'string')
			return fallback;
		const cfg = c as ConsentConfig;
		return { ...cfg, rev: Number(cfg.rev) || 1, site: cfg.site || site };
	} catch {
		return fallback;
	}
}

/** Safe until the hosted config arrives: Google Consent Mode and Microsoft UET default to denied. */
export function hostedDefaults(w: SignalTarget): void {
	applyDefaults(w, { ...NONE_GRANTED }, { googleConsentMode: true, microsoftUet: true, meta: false, tiktok: false, posthog: false, scriptBlocking: false }); // prettier-ignore
}

export function fromScript(s: HTMLScriptElement | null): Partial<ConsentConfig> {
	if (!s) return {};
	const d = s.dataset;
	const c: Partial<ConsentConfig> = {};
	if (d.mode) c.mode = d.mode as ConsentConfig['mode'];
	if (d.rev) c.rev = Number(d.rev) || 1;
	if (d.lang) c.lang = d.lang;
	if (d.position) c.position = d.position as BannerPosition;
	if (d.floating) c.floatingButton = d.floating !== 'false';
	if (d.preferences) c.preferencesCategory = d.preferences !== 'false';
	if (d.avoid) c.avoidSelector = d.avoid;
	if (d.gpc) c.gpc = d.gpc === 'true';
	if (d.record || d.seen) c.endpoints = { record: d.record, seen: d.seen };
	if (d.privacy || d.cookiesPage || d.choices)
		c.links = { privacyPolicy: d.privacy, cookiePolicy: d.cookiesPage, privacyChoices: d.choices };
	return c;
}

const script =
	typeof document !== 'undefined' ? (document.currentScript as HTMLScriptElement | null) : null;

const api: Api = {
	init(cfg, opts) {
		api.destroy?.();
		const config: ConsentConfig = {
			mode: 'auto',
			rev: 1,
			floatingButton: true,
			...fromScript(script),
			...window.EcomCookieConfig,
			...cfg
		};
		const m = createConsent(config, opts);
		Object.assign(api, m);
		return m;
	}
};
if (typeof window !== 'undefined') {
	window.EcomCookie = api;
	const site = script?.dataset.site;
	if (site && script?.src) {
		hostedDefaults(window as unknown as SignalTarget);
		const f = typeof fetch === 'function' ? fetch.bind(globalThis) : undefined;
		void loadHosted(site, script.src, f).then((c) => {
			if (script.dataset.auto !== 'false') api.init(c);
		});
	} else if (script?.dataset.auto !== 'false') {
		api.init();
	}
}
