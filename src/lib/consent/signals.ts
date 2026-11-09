/**
 * Fan the visitor's grants out to vendors. Every call is guarded: a missing vendor never throws.
 * Never imports vendor SDKs; it talks to the globals (or the PostHog instance passed in).
 */
import type { ConsentIntegrations, Grants } from './types.ts';

/** Minimal PostHog surface we use (posthog-js compatible). */
export interface PostHogLike {
	opt_in_capturing(): void;
	opt_out_capturing(): void;
	reset?(): void;
	has_opted_in_capturing?(): boolean | undefined;
	get_explicit_consent_status?(): string | undefined;
}

type Fn = (...args: unknown[]) => void;
/** The bits of `window` we read or write. Pass a fake object in tests. */
export interface SignalTarget {
	dataLayer?: unknown[];
	gtag?: Fn;
	uetq?: { push: Fn } | unknown[];
	fbq?: Fn;
	ttq?: { holdConsent?: Fn; grantConsent?: Fn; revokeConsent?: Fn };
	posthog?: PostHogLike;
	document?: Document;
}

export const DEFAULT_INTEGRATIONS: ConsentIntegrations = {
	googleConsentMode: true,
	microsoftUet: true,
	meta: true,
	tiktok: true,
	posthog: true,
	scriptBlocking: true
};

const g = (on: boolean) => (on ? 'granted' : 'denied');
const safe = (f: () => void) => {
	try {
		f();
	} catch {
		/* a vendor error must never reach the page */
	}
};

export function googleState(grants: Grants) {
	return {
		ad_storage: g(grants.marketing),
		ad_user_data: g(grants.marketing),
		ad_personalization: g(grants.marketing),
		analytics_storage: g(grants.analytics),
		functionality_storage: 'granted',
		security_storage: 'granted',
		personalization_storage: g(grants.preferences)
	};
}

function ensureGtag(w: SignalTarget): Fn {
	if (!Array.isArray(w.dataLayer)) w.dataLayer = [];
	if (typeof w.gtag !== 'function') {
		const dl = w.dataLayer;
		// gtag.js reads the Arguments object, so keep `arguments` (not rest args).
		w.gtag = function () {
			// eslint-disable-next-line prefer-rest-params
			dl.push(arguments);
		};
	}
	return w.gtag;
}

/** Called once at init with the mode's effective defaults (before any vendor tag runs). */
export function applyDefaults(
	w: SignalTarget,
	grants: Grants,
	int: Partial<ConsentIntegrations> = {}
) {
	const on = { ...DEFAULT_INTEGRATIONS, ...int };
	if (on.googleConsentMode)
		safe(() =>
			ensureGtag(w)('consent', 'default', { ...googleState(grants), wait_for_update: 500 })
		);
	if (on.microsoftUet)
		safe(() => {
			if (!w.uetq) w.uetq = [];
			(w.uetq as { push: Fn }).push('consent', 'default', { ad_storage: g(grants.marketing) });
		});
	if (on.tiktok) safe(() => w.ttq?.holdConsent?.());
}

export interface ApplyOptions {
	posthog?: PostHogLike | null;
	/** True on the first apply of a page with no choice yet (PostHog stays pending). */
	pending?: boolean;
	/** Push the dataLayer event (default true). */
	event?: boolean;
}

/** Apply grants: on init when a choice exists, and on every change. */
export function applyGrants(
	w: SignalTarget,
	grants: Grants,
	int: Partial<ConsentIntegrations> = {},
	opts: ApplyOptions = {}
) {
	const on = { ...DEFAULT_INTEGRATIONS, ...int };
	if (on.googleConsentMode) safe(() => ensureGtag(w)('consent', 'update', googleState(grants)));
	if (on.microsoftUet)
		safe(() => {
			if (!w.uetq) w.uetq = [];
			(w.uetq as { push: Fn }).push('consent', 'update', { ad_storage: g(grants.marketing) });
		});
	if (on.meta && typeof w.fbq === 'function')
		safe(() => w.fbq!('consent', grants.marketing ? 'grant' : 'revoke'));
	if (on.tiktok && w.ttq)
		safe(() => (grants.marketing ? w.ttq?.grantConsent?.() : w.ttq?.revokeConsent?.()));
	if (on.posthog && !opts.pending)
		safe(() => applyPostHog(opts.posthog ?? w.posthog, grants.analytics));
	if (opts.event !== false)
		safe(() => {
			if (!Array.isArray(w.dataLayer)) w.dataLayer = [];
			w.dataLayer.push({ event: 'ecom_cookie_update', ...grants });
		});
	if (on.scriptBlocking && w.document) safe(() => activateScripts(w.document!, grants));
}

export function applyPostHog(ph: PostHogLike | null | undefined, analytics: boolean) {
	if (!ph) return;
	const optedIn = ph.has_opted_in_capturing?.() ?? ph.get_explicit_consent_status?.() === 'granted';
	if (analytics) {
		if (!optedIn) ph.opt_in_capturing();
	} else if (optedIn) {
		ph.reset?.();
		ph.opt_out_capturing();
	} else if (ph.get_explicit_consent_status?.() !== 'denied') ph.opt_out_capturing();
}

const DONE = 'data-consent-activated';
/** Clone `<script type="text/plain" data-consent="...">` into real scripts once allowed (never twice). */
export function activateScripts(doc: Document, grants: Grants) {
	const list = doc.querySelectorAll<HTMLScriptElement>('script[type="text/plain"][data-consent]');
	for (const old of Array.from(list)) {
		if (old.hasAttribute(DONE)) continue;
		const cats = (old.getAttribute('data-consent') ?? '').split(/[\s,]+/).filter(Boolean);
		const ok =
			cats.length > 0 && cats.every((c) => c === 'necessary' || grants[c as keyof Grants] === true);
		if (!ok) continue;
		old.setAttribute(DONE, '');
		const s = doc.createElement('script');
		for (const a of Array.from(old.attributes))
			if (a.name !== 'type' && a.name !== 'data-src' && a.name !== DONE)
				s.setAttribute(a.name, a.value);
		const t = old.getAttribute('data-type');
		if (t) s.type = t;
		const src = old.getAttribute('data-src');
		if (src) s.src = src;
		else s.text = old.text;
		old.parentNode?.insertBefore(s, old.nextSibling);
	}
}
