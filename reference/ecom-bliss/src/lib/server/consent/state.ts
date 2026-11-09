/**
 * Ecom Cookie: the consent state of one storefront request (region mode, Global Privacy Control,
 * the saved choice, what is allowed now and which banner to show), and the browser config.
 * Engineering defaults, not legal advice.
 */
import type { Cookies } from '@sveltejs/kit';
import { countryOf, optInCountries } from '#lib/server/ads/attribution.ts';
import { readSession } from '#lib/server/auth.ts';
import { publishedPolicyPages } from '#lib/storefront/policy-pages.server.ts';
import { bannerFor, effectiveGrants, MODE_RULES, modeFor } from '#lib/consent/regions.ts';
import { decodeConsent, isConsentMode } from '#lib/consent/cookie.ts';
import {
	ALL_GRANTED,
	CONSENT_COOKIE_NAME,
	LEGACY_CONSENT_COOKIE,
	NONE_GRANTED,
	type ConsentConfig,
	type ConsentMode,
	type Grants,
	type StoredConsent
} from '#lib/consent/types.ts';
import { getSetting } from '#lib/server/settings.ts';
import { getConsentSettings, LANG_RE, withCookieLabels, type ConsentSettings } from './settings.ts';

export interface ConsentEvent {
	request: Request;
	cookies: Pick<Cookies, 'get'>;
	platform?: unknown;
}

export interface ConsentRequestState {
	mode: ConsentMode;
	country: string | null;
	regionCode: string | null;
	/** The browser sent `Sec-GPC: 1`. */
	gpc: boolean;
	/** The saved choice (eb_cc, else the old eb_consent cookie), or null. */
	stored: StoredConsent | null;
	/** True when `stored` came from the old eb_consent cookie. */
	legacy: boolean;
	grants: Grants;
	banner: 'full' | 'notice' | null;
	rev: number;
}

export function regionCodeOf(event: Pick<ConsentEvent, 'platform'>): string | null {
	const cf = (event.platform as { cf?: { regionCode?: unknown } } | null | undefined)?.cf;
	const raw = typeof cf?.regionCode === 'string' ? cf.regionCode.trim().toUpperCase() : '';
	return /^[A-Z0-9]{1,3}$/.test(raw) ? raw : null;
}

/** Old ads-only cookie read as a choice made now under the current revision. */
function legacyChoice(
	value: string | undefined,
	mode: ConsentMode,
	rev: number,
	now: number
): StoredConsent | null {
	const optIn = MODE_RULES[mode].optIn;
	const base = { id: '', at: now, rev };
	if (value === 'granted')
		return {
			...base,
			mode: optIn ? mode : 'opt-in',
			grants: { ...ALL_GRANTED },
			action: 'accept_all'
		};
	if (value === 'denied')
		return {
			...base,
			mode: optIn ? mode : 'opt-in',
			grants: { ...NONE_GRANTED },
			action: 'reject_all'
		};
	if (value === 'optout')
		return { ...base, mode, grants: { ...ALL_GRANTED, marketing: false }, action: 'custom' };
	return null;
}

/**
 * The saved choice. The browser writes eb_cc on the root domain, so an older host-only eb_cc can
 * also be sent: with several values the newest (highest time) wins.
 */
export function newestConsent(
	cookieHeader: string | null,
	cookies: Pick<Cookies, 'get'>
): StoredConsent | null {
	let best: StoredConsent | null = null;
	for (const part of (cookieHeader ?? '').split(';')) {
		const i = part.indexOf('=');
		if (i <= 0 || part.slice(0, i).trim() !== CONSENT_COOKIE_NAME) continue;
		const c = decodeConsent(part.slice(i + 1).trim());
		if (c && (!best || c.at > best.at)) best = c;
	}
	return best ?? decodeConsent(cookies.get(CONSENT_COOKIE_NAME));
}

/** Store logo and name for the banner, when the owner shows the logo and one exists. */
async function bannerBrand(
	settings: ConsentSettings
): Promise<{ logoUrl?: string; brandName?: string }> {
	if (!settings.showLogo) return {};
	try {
		const [logo, name] = await Promise.all([
			getSetting<string | null>('store.logoUrl', null),
			getSetting<string | null>('store.name', null)
		]);
		if (!logo) return {};
		return { logoUrl: logo, brandName: name || 'My Store' };
	} catch {
		return {};
	}
}

export async function consentRequestState(
	event: ConsentEvent,
	opts: { settings?: ConsentSettings; now?: number } = {}
): Promise<ConsentRequestState> {
	const now = opts.now ?? Date.now();
	const settings = opts.settings ?? (await getConsentSettings());
	const country = countryOf(event);
	const regionCode = regionCodeOf(event);
	const mode = modeFor(country, regionCode, await optInCountries(now));
	const gpc = event.request.headers.get('sec-gpc') === '1';
	const rev = settings.rev;
	let stored = newestConsent(event.request.headers.get('cookie'), event.cookies);
	let legacy = false;
	if (!stored) {
		stored = legacyChoice(event.cookies.get(LEGACY_CONSENT_COOKIE), mode, rev, now);
		legacy = !!stored;
	}
	return {
		mode,
		country,
		regionCode,
		gpc,
		stored,
		legacy,
		grants: effectiveGrants(mode, stored, rev, gpc, now),
		banner: bannerFor(mode, stored, rev, { gpc, noticeBanner: settings.noticeBanner }, now),
		rev
	};
}

/**
 * Admin-only banner preview: `?consent_preview=<mode>` (and optional `&consent_lang=xx`) while signed
 * in to the admin. Returns null for everyone else or an unknown mode.
 */
export async function consentPreviewFor(event: {
	url: URL;
	cookies: Cookies;
}): Promise<{ mode: ConsentMode; lang: string | null } | null> {
	const mode = event.url.searchParams.get('consent_preview');
	if (!isConsentMode(mode)) return null;
	if (!(await readSession(event.cookies, 'admin'))) return null;
	const lang = (event.url.searchParams.get('consent_lang') ?? '').toLowerCase();
	return { mode, lang: LANG_RE.test(lang) && lang !== '*' ? lang : null };
}

/** The published privacy page, if any. */
export async function privacyPolicyUrl(): Promise<string | undefined> {
	try {
		const pages = await publishedPolicyPages();
		return pages.some((p) => p.handle === 'privacy') ? '/pages/privacy' : undefined;
	} catch {
		return undefined;
	}
}

export const CONSENT_RECORD_ENDPOINT = '/api/consent';
export const CONSENT_SEEN_ENDPOINT = '/api/consent/seen';
export const CONSENT_PREVIEW_COOKIE = 'eb_cc_preview';

/**
 * Everything the browser banner needs for this request. Returns null when the owner turned the
 * banner off. In an admin preview the config uses a separate cookie name and no endpoints, so the
 * banner always shows and nothing is recorded or changed for the owner's real choice.
 */
export async function clientConfigFor(
	event: ConsentEvent & { url: URL; cookies: Cookies },
	now = Date.now()
): Promise<ConsentConfig | null> {
	const settings = await getConsentSettings();
	const preview = await consentPreviewFor(event).catch(() => null);
	if (!settings.enabled && !preview) return null;
	const state = await consentRequestState(event, { settings, now });
	const [privacyPolicy, brand] = await Promise.all([privacyPolicyUrl(), bannerBrand(settings)]);
	return {
		mode: preview?.mode ?? state.mode,
		country: state.country,
		region: state.regionCode,
		gpc: state.gpc,
		rev: settings.rev,
		...(preview?.lang ? { lang: preview.lang } : {}),
		texts: settings.texts,
		theme: settings.theme,
		position: settings.position,
		preferencesCategory: settings.preferencesCategory,
		floatingButton: settings.floatingButton,
		noticeBanner: settings.noticeBanner,
		cookies: withCookieLabels(settings.cookies),
		links: { ...(privacyPolicy ? { privacyPolicy } : {}), privacyChoices: '/privacy-choices' },
		endpoints: preview ? {} : { record: CONSENT_RECORD_ENDPOINT, seen: CONSENT_SEEN_ENDPOINT },
		cookieName: preview ? CONSENT_PREVIEW_COOKIE : CONSENT_COOKIE_NAME,
		integrations: settings.integrations,
		...brand,
		compactOn: ['/checkout', '/cart'],
		avoidSelector: '[data-sticky-cta]'
	};
}
