import { describe, expect, it } from 'vitest';
import { ALL_GRANTED, NONE_GRANTED, type StoredConsent } from './types.ts';
import { mayLoadIdentifyingTag, needsExplicitClick } from './wiretap.ts';

const NOW = Date.UTC(2026, 10, 3);
const choice = (over: Partial<StoredConsent> = {}): StoredConsent => ({
	id: 'abcdefghijklmnop',
	at: NOW - 1000,
	mode: 'opt-out-gpc',
	rev: 1,
	grants: { ...ALL_GRANTED },
	action: 'accept_all',
	...over
});
const CALIFORNIA = { country: 'US', region: 'CA', rev: 1 };
const TEXAS = { country: 'US', region: 'TX', rev: 1 };
const may = (
	stored: StoredConsent | null,
	place: { country?: string | null; region?: string | null; rev: number },
	grants = stored?.grants ?? ALL_GRANTED
) => mayLoadIdentifyingTag({ stored, grants }, place, NOW);

describe('where an explicit click is needed', () => {
	it('covers California and the other all-party-consent states', () => {
		for (const r of ['CA', 'FL', 'PA', 'WA', 'IL', 'MA'])
			expect(needsExplicitClick('US', r)).toBe(true);
	});
	it('treats an unknown place or US state as strict', () => {
		for (const [c, r] of [
			[null, null],
			['XX', null],
			['US', null],
			['US', '']
		] as const)
			expect(needsExplicitClick(c, r)).toBe(true);
	});
	it('leaves other states and countries to the normal ad-tag rule', () => {
		expect(needsExplicitClick('US', 'TX')).toBe(false);
		expect(needsExplicitClick('US', 'VA')).toBe(false);
		expect(needsExplicitClick('AU', null)).toBe(false);
		expect(needsExplicitClick('CA', 'ON')).toBe(false);
	});
});

describe('identifying tag consent rule', () => {
	it('in California, loads only after Accept all', () => {
		expect(may(choice(), CALIFORNIA)).toBe(true);
		expect(may(null, CALIFORNIA, { ...ALL_GRANTED })).toBe(false);
		for (const action of ['acknowledge', 'gpc', 'reject_all', 'withdraw'] as const)
			expect(may(choice({ action }), CALIFORNIA)).toBe(false);
	});
	it('in California, saved settings count only if marketing started switched off', () => {
		expect(may(choice({ action: 'custom' }), CALIFORNIA)).toBe(false);
		expect(may(choice({ action: 'custom', mode: 'opt-in' }), CALIFORNIA)).toBe(true);
	});
	it('in a state like Texas, follows the normal marketing default', () => {
		expect(may(null, TEXAS, { ...ALL_GRANTED })).toBe(true);
		expect(may(choice({ action: 'acknowledge' }), TEXAS)).toBe(true);
	});
	it('never loads when marketing is off (opt-out, GPC or reject), anywhere', () => {
		for (const place of [CALIFORNIA, TEXAS, { country: 'DE', rev: 1 }])
			expect(may(choice(), place, { ...ALL_GRANTED, marketing: false })).toBe(false);
		expect(may(null, { country: 'DE', rev: 1 }, { ...NONE_GRANTED })).toBe(false);
	});
	it('asks again in California when the owner raises the banner revision', () => {
		expect(may(choice(), { ...CALIFORNIA, rev: 2 })).toBe(false);
	});
});
