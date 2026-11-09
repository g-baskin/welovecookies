import { isCurrent } from '#lib/consent/regions.ts';
import type { ConsentState } from '#lib/consent/consent.ts';

// Visitor ID pixel. Loads only when marketing is allowed. Where wiretap law needs every party's
// consent (California and similar states), it also needs an explicit Accept, never a default or "OK".
export const VISITOR_PIXEL_SRC = 'https://px.lspxl.com/c/bbadc380-6fa9-41e8-a05f-3419b2b165e7';

/** Hosts the vendor says the pixel uses, for the store's Content-Security-Policy. */
export const VISITOR_PIXEL_CSP = {
	script: ['https://px.lspxl.com', 'https://cdn.lgncmp.com'],
	style: ['https://cdn.lgncmp.com'],
	connect: [
		'https://lgncmp.com',
		'https://i.lspxl.com',
		'https://popup.lspxl.com',
		'https://sec.lspxl.com',
		'https://t.lspxl.com'
	]
} as const;

/** The pixel company's domains, to find it in the cookie list. */
export const VISITOR_PIXEL_DOMAINS = ['lspxl.com', 'lgncmp.com'] as const;

/** When ALL_PARTY_CONSENT_STATES was last checked against legal sources (the weekly check asks again). */
export const ALL_PARTY_STATES_CHECKED = '2026-11-03';
/** US states with all-party-consent wiretap laws (the CIPA-style pixel claims). */
export const ALL_PARTY_CONSENT_STATES: ReadonlySet<string> = new Set([
	'CA', 'CT', 'DE', 'FL', 'IL', 'MD', 'MA', 'MT', 'NV', 'NH', 'PA', 'WA'
]); // prettier-ignore

/** Countries that already ask first need a click anyway; unknown places are treated as strict. */
export function needsExplicitClick(country?: string | null, region?: string | null): boolean {
	const c = (country ?? '').trim().toUpperCase();
	if (!/^[A-Z]{2}$/.test(c) || c === 'XX' || c === 'T1') return true;
	if (c !== 'US') return false;
	const r = (region ?? '').trim().toUpperCase();
	return !/^[A-Z]{2}$/.test(r) || ALL_PARTY_CONSENT_STATES.has(r);
}

export function mayLoadVisitorPixel(
	state: Pick<ConsentState, 'grants' | 'stored'>,
	place: { country?: string | null; region?: string | null; rev: number },
	now = Date.now()
): boolean {
	if (!state.grants.marketing) return false;
	if (!needsExplicitClick(place.country, place.region)) return true;
	const s = state.stored;
	if (!s || !isCurrent(s, place.rev, now) || !s.grants.marketing) return false;
	// In opt-out regions the settings panel starts switched on, so only opt-in "custom" is active.
	return s.action === 'accept_all' || (s.action === 'custom' && s.mode === 'opt-in');
}

const MARK = 'data-visitor-pixel';
/** Adds the vendor tag once per page. A withdrawal takes effect on the next page load. */
export function loadVisitorPixel(doc: Pick<Document, 'head' | 'createElement' | 'querySelector'>) {
	if (doc.querySelector(`script[${MARK}]`)) return;
	const s = doc.createElement('script');
	s.async = true;
	s.src = VISITOR_PIXEL_SRC;
	s.setAttribute(MARK, '');
	doc.head.appendChild(s);
}
