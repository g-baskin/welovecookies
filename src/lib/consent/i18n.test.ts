import { describe, expect, it } from 'vitest';
import { LANGUAGES, builtInTexts, isRtl, pickLanguage, textsFor } from './i18n.ts';

const leaves = (o: unknown, p = ''): [string, unknown][] =>
	typeof o === 'object' && o
		? Object.entries(o).flatMap(([k, v]) => leaves(v, p ? `${p}.${k}` : k))
		: [[p, o]];

describe('i18n', () => {
	it('has 20 complete languages', () => {
		expect([...LANGUAGES].sort()).toEqual(
			[
				'en',
				'es',
				'fr',
				'de',
				'it',
				'pt',
				'nl',
				'pl',
				'sv',
				'da',
				'nb',
				'fi',
				'ja',
				'ko',
				'zh',
				'tr',
				'ar',
				'th',
				'vi',
				'id'
			].sort()
		);
		const keys = leaves(builtInTexts('en')).map(([k]) => k);
		for (const l of LANGUAGES) {
			const t = leaves(builtInTexts(l));
			expect(t.map(([k]) => k)).toEqual(keys);
			for (const [k, v] of t)
				expect(typeof v === 'string' && v.trim().length > 0, `${l}.${k}`).toBe(true);
		}
		expect(builtInTexts('en').body.split(/\s+/).length).toBeLessThanOrEqual(40);
	});
	it('picks languages', () => {
		expect(pickLanguage(['de-AT', 'en'])).toBe('de');
		expect(pickLanguage(['xx', 'pt-BR'])).toBe('pt');
		expect(pickLanguage(['no'])).toBe('nb');
		expect(pickLanguage(['nn-NO'])).toBe('nb');
		expect(pickLanguage(['zz'])).toBe('en');
		expect(pickLanguage(['de'], 'fr')).toBe('fr');
		expect(isRtl('ar')).toBe(true);
		expect(isRtl('en')).toBe(false);
	});
	it('merges overrides without mutating built-ins', () => {
		const t = textsFor('de', {
			'*': { title: 'All', categories: { analytics: { title: 'A', description: 'x' } } as never },
			de: { title: 'DE' }
		});
		expect(t.title).toBe('DE');
		expect(t.categories.analytics.title).toBe('A');
		expect(t.categories.marketing.title).toBe('Marketing');
		expect(builtInTexts('de').title).not.toBe('DE');
	});
});
