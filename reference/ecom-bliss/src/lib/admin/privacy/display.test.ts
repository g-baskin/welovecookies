import { describe, expect, it } from 'vitest';
import {
	ACTION_LABEL,
	browserName,
	countryName,
	languageName,
	MODE_LABEL,
	placeName
} from './display.ts';
import {
	DEFAULT_COOKIES,
	parseConsentSettings,
	withCookieLabels
} from '#lib/server/consent/settings.ts';
import { CONSENT_ACTIONS, CONSENT_MODES } from '#lib/consent/types.ts';

describe('plain names (owner rule: never show codes or field names)', () => {
	it('names places, languages and browsers in words', () => {
		expect(countryName('DE')).toBe('Germany');
		expect(countryName('')).toBe('Unknown');
		expect(countryName('XX')).toBe('Unknown');
		expect(placeName('US', 'CA')).toBe('California, United States');
		expect(placeName('CA', 'QC')).toBe('Quebec, Canada');
		expect(placeName('FR', 'IDF')).toBe('France');
		expect(languageName('de')).toBe('German');
		expect(
			browserName(
				'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
			)
		).toBe('Safari on iPhone');
		expect(
			browserName(
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
			)
		).toBe('Chrome on Windows');
	});

	it('every choice and rule has a label', () => {
		for (const a of CONSENT_ACTIONS) expect(ACTION_LABEL[a]).toMatch(/^[A-Z][a-z ]+/);
		for (const m of CONSENT_MODES) expect(MODE_LABEL[m]).toMatch(/^[A-Z]/);
	});

	it('cookie names are shown in plain words, including lists saved with only technical names', () => {
		for (const c of DEFAULT_COOKIES) expect(c.label).toMatch(/^[A-Z][a-z]/);
		for (const c of DEFAULT_COOKIES) expect(c.label).not.toMatch(/[_*]|^eb|^ph/);
		const old = parseConsentSettings({
			cookies: [
				{ name: 'eb_cart', provider: 'This store', category: 'necessary', purpose: 'Bag.', duration: '30 days' },
				{ name: 'Gift notes', provider: 'This store', category: 'necessary', purpose: 'Notes.', duration: '1 day' }
			]
		}); // prettier-ignore
		// The technical name is kept for clearing cookies; the label is what people read.
		expect(withCookieLabels(old.cookies).map((c) => c.label ?? c.name)).toEqual([
			'Your shopping bag',
			'Gift notes'
		]);
	});
});
