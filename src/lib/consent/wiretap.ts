import { isCurrent } from './regions.ts';
import type { ConsentState } from './consent.ts';

// Tags that identify visitors or record sessions draw wiretap claims (CIPA-style) in all-party-consent
// states, so there they need an explicit Accept, never a default or "OK". Engineering default, not legal advice.

/** When ALL_PARTY_CONSENT_STATES was last checked against legal sources; re-check every 6 months. */
export const ALL_PARTY_STATES_CHECKED = '2026-11-03';
/** US states with all-party-consent wiretap laws. */
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

/** Whether a visitor-identifying or session-recording tag may load for this visitor right now. */
export function mayLoadIdentifyingTag(
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
