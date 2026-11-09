/**
 * Which consent mode applies where, and what each mode does. Framework-free.
 * Sources and reasoning: docs/privacy/consent-law-matrix.md (as of Nov 2026).
 * Engineering defaults, not legal advice. Unknown country = opt-in (safest).
 */
import {
	ALL_GRANTED,
	NONE_GRANTED,
	type ConsentMode,
	type Grants,
	type StoredConsent
} from './types.ts';

const EU_EEA = [
	'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV',
	'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO'
] as const; // prettier-ignore

/** Country (ISO 3166-1 alpha-2) to mode. Countries not listed use DEFAULT_MODE. */
export const COUNTRY_MODES: Readonly<Record<string, ConsentMode>> = {
	...Object.fromEntries(EU_EEA.map((c) => [c, 'opt-in' as const])),
	GB: 'opt-in-uk',
	// Switzerland: nFADP is opt-out by most readings, but this store has always asked first there.
	CH: 'opt-in',
	CA: 'opt-out',
	BR: 'opt-in', MX: 'opt-in-light', AR: 'opt-in-light', CL: 'opt-in-light', CO: 'opt-in-light',
	CN: 'opt-in', JP: 'notice', KR: 'opt-in', IN: 'opt-in-light', SG: 'opt-in-light',
	TH: 'opt-in', VN: 'opt-in', ID: 'opt-in-light', PH: 'opt-in-light',
	AU: 'notice', NZ: 'notice',
	ZA: 'opt-in-light', NG: 'opt-in', KE: 'opt-in-light',
	TR: 'opt-in', SA: 'opt-in', AE: 'opt-in-light', IL: 'opt-in-light'
}; // prettier-ignore

/** Country-region overrides ("CA-QC"), checked before the country. */
export const REGION_MODES: Readonly<Record<string, ConsentMode>> = { 'CA-QC': 'opt-in' };

/** US states (request.cf.regionCode). Unlisted states and DC are `notice`. */
export const US_STATE_MODES: Readonly<Record<string, ConsentMode>> = {
	...Object.fromEntries(
		['CA', 'CO', 'CT', 'DE', 'MD', 'MN', 'MT', 'NE', 'NH', 'NJ', 'OR', 'TX'].map((s) => [
			s,
			'opt-out-gpc' as const
		])
	),
	...Object.fromEntries(
		['VA', 'UT', 'FL', 'IA', 'TN', 'IN', 'KY', 'RI'].map((s) => [s, 'opt-out' as const])
	)
};
/** US visitor without a known state: the strictest US mode. */
export const US_DEFAULT_MODE: ConsentMode = 'opt-out-gpc';
export const US_UNLISTED_STATE_MODE: ConsentMode = 'notice';
/** Unknown or unlisted country. */
export const DEFAULT_MODE: ConsentMode = 'opt-in';

const CODE = /^[A-Z]{2}$/;
const clean = (v: string | null | undefined) => {
	const s = (v ?? '').trim().toUpperCase();
	return CODE.test(s) && s !== 'XX' && s !== 'T1' ? s : null;
};

/**
 * The mode for a visitor. `forceOptIn` is the owner's extra opt-in country list (always wins).
 * regionCode is Cloudflare's request.cf.regionCode (US state, Canadian province...).
 */
export function modeFor(
	country: string | null | undefined,
	regionCode?: string | null,
	forceOptIn: Iterable<string> = []
): ConsentMode {
	const c = clean(country);
	if (!c) return DEFAULT_MODE;
	if (new Set(forceOptIn).has(c)) return 'opt-in';
	const r = (regionCode ?? '').trim().toUpperCase();
	if (r && REGION_MODES[`${c}-${r}`]) return REGION_MODES[`${c}-${r}`];
	if (c === 'US') {
		if (!/^[A-Z]{2}$/.test(r)) return US_DEFAULT_MODE;
		return US_STATE_MODES[r] ?? US_UNLISTED_STATE_MODE;
	}
	return COUNTRY_MODES[c] ?? DEFAULT_MODE;
}

export interface ModeRule {
	/** Consent is needed before optional categories run. */
	optIn: boolean;
	/** full = Accept all / Reject all / Choose; notice = short notice with OK + choices link; none. */
	banner: 'full' | 'notice' | 'none';
	/** Grants before any choice (Global Privacy Control still turns marketing off). */
	defaults: Grants;
	/** The law requires honouring GPC (we honour it everywhere anyway). */
	gpcRequired: boolean;
	/** Show a "Do Not Sell or Share My Personal Information" link. */
	doNotSellLink: boolean;
	/** A saved choice is asked again after this many days. */
	maxAgeDays: number;
}

const OPT_IN_RULE: ModeRule = {
	optIn: true,
	banner: 'full',
	defaults: NONE_GRANTED,
	gpcRequired: false,
	doNotSellLink: false,
	maxAgeDays: 180
};
export const MODE_RULES: Readonly<Record<ConsentMode, ModeRule>> = {
	'opt-in': OPT_IN_RULE,
	'opt-in-uk': OPT_IN_RULE,
	'opt-in-light': OPT_IN_RULE,
	'opt-out-gpc': {
		optIn: false,
		banner: 'notice',
		defaults: ALL_GRANTED,
		gpcRequired: true,
		doNotSellLink: true,
		maxAgeDays: 365
	},
	'opt-out': {
		optIn: false,
		banner: 'notice',
		defaults: ALL_GRANTED,
		gpcRequired: false,
		doNotSellLink: true,
		maxAgeDays: 365
	},
	notice: {
		optIn: false,
		banner: 'none',
		defaults: ALL_GRANTED,
		gpcRequired: false,
		doNotSellLink: false,
		maxAgeDays: 365
	}
};

const DAY_MS = 86_400_000;

/** A saved choice still counts: same or newer revision and not older than its mode's max age. */
export function isCurrent(stored: StoredConsent | null, rev: number, now = Date.now()) {
	if (!stored || stored.rev < rev) return false;
	return now - stored.at < MODE_RULES[stored.mode].maxAgeDays * DAY_MS && stored.at <= now + DAY_MS;
}

/**
 * What is allowed right now. A current saved choice wins when it was made under an equally strict
 * mode; travelling from an opt-out region into an opt-in one asks again. GPC turns marketing off.
 */
export function effectiveGrants(
	mode: ConsentMode,
	stored: StoredConsent | null,
	rev: number,
	gpc: boolean,
	now = Date.now()
): Grants {
	const rule = MODE_RULES[mode];
	const usable = isCurrent(stored, rev, now) && (!rule.optIn || MODE_RULES[stored!.mode].optIn);
	const base = usable ? stored!.grants : rule.defaults;
	return gpc ? { ...base, marketing: false } : { ...base };
}

/** Which banner to show now: 'full', 'notice' or null. */
export function bannerFor(
	mode: ConsentMode,
	stored: StoredConsent | null,
	rev: number,
	opts: { gpc?: boolean; noticeBanner?: { optOut: boolean; notice: boolean } } = {},
	now = Date.now()
): 'full' | 'notice' | null {
	const rule = MODE_RULES[mode];
	if (rule.optIn) {
		const usable = isCurrent(stored, rev, now) && MODE_RULES[stored!.mode].optIn;
		return usable ? null : 'full';
	}
	if (isCurrent(stored, rev, now)) return null;
	const nb = { optOut: true, notice: false, ...opts.noticeBanner };
	if (rule.banner === 'notice') return nb.optOut ? 'notice' : null;
	return nb.notice ? 'notice' : null;
}

/**
 * Best guess when no server tells us the country (standalone script, mode 'auto'):
 * the browser's IANA time zone. Errs to opt-in.
 */
export function modeFromTimeZone(tz: string | null | undefined): ConsentMode {
	const z = tz ?? '';
	if (z === 'Europe/London' || z === 'Europe/Belfast') return 'opt-in-uk';
	if (/^(Europe|Atlantic\/(Reykjavik|Canary|Madeira|Azores))\//.test(z)) return 'opt-in';
	if (/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|Regina|St_Johns)$/.test(z))
		return 'opt-out';
	if (/^America\/Montreal$/.test(z)) return 'opt-in';
	if (
		/^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Indiana\/.+|Kentucky\/.+|North_Dakota\/.+|Juneau|Sitka|Nome|Adak|Menominee)|Pacific\/Honolulu)$/.test(
			z
		)
	)
		return 'opt-out-gpc';
	if (/^Asia\/Tokyo$/.test(z) || /^(Australia|Pacific\/Auckland)/.test(z)) return 'notice';
	return DEFAULT_MODE;
}
