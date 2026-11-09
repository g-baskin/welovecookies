/**
 * Built-in banner texts for 20 languages (rows in ./i18n/*.ts), language picking and owner overrides.
 * Tone: warm, short, specific, no guilt, no perks. Formal register where natural (de Sie, fr vous).
 */
import { A } from './i18n/a.ts';
import { B } from './i18n/b.ts';
import { C } from './i18n/c.ts';
import { D } from './i18n/d.ts';
import type { Row } from './i18n/row.ts';
import type { ConsentTextOverrides, ConsentTexts } from './types.ts';

const ROWS: Record<string, Row> = { ...A, ...B, ...C, ...D };

const toTexts = (r: Row): ConsentTexts => ({
	title: r[0], body: r[1], noticeBody: r[2], acceptAll: r[3], rejectAll: r[4], customize: r[5],
	acknowledge: r[6], save: r[7], close: r[8], preferencesTitle: r[9], preferencesIntro: r[10],
	alwaysOn: r[11],
	categories: {
		necessary: { title: r[12], description: r[13] },
		preferences: { title: r[14], description: r[15] },
		analytics: { title: r[16], description: r[17] },
		marketing: { title: r[18], description: r[19] }
	},
	showCookies: r[20], hideCookies: r[21],
	cookieTable: { name: r[22], provider: r[23], purpose: r[24], duration: r[25] },
	privacyPolicy: r[26], cookiePolicy: r[27], reopen: r[28], doNotSell: r[29], gpcHonored: r[30],
	saved: r[31]
}); // prettier-ignore

export const LANGUAGES: readonly string[] = Object.keys(ROWS).sort();
export const DEFAULT_LANGUAGE = 'en';
const RTL = new Set(['ar', 'he', 'fa', 'ur']);

const primary = (tag: string) => {
	const p = tag.trim().toLowerCase().split(/[-_]/)[0] ?? '';
	return p === 'no' || p === 'nn' ? 'nb' : p;
};

/** Built-in texts for a language (English fallback). Returns a fresh object. */
export function builtInTexts(lang: string): ConsentTexts {
	return toTexts(ROWS[primary(lang)] ?? (ROWS.en as Row));
}

/** First supported language from a forced value, then the browser list; English otherwise. */
export function pickLanguage(preferred: readonly string[], forced?: string | null): string {
	for (const tag of forced ? [forced, ...preferred] : preferred) {
		const p = primary(tag);
		if (ROWS[p]) return p;
	}
	return DEFAULT_LANGUAGE;
}

export const isRtl = (lang: string) => RTL.has(primary(lang));

/** Built-ins, then overrides['*'], then overrides[lang]; nested groups merge per key. */
/** Only non-blank strings override: an emptied field falls back to the built-in text. */
const filled = (o: object) =>
	Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === 'string' && v.trim() !== ''));

export function textsFor(
	lang: string,
	overrides: Record<string, ConsentTextOverrides> = {}
): ConsentTexts {
	const out = builtInTexts(lang);
	for (const o of [overrides['*'], overrides[lang]]) {
		if (!o) continue;
		const { categories, cookieTable, ...flat } = o;
		Object.assign(out, filled(flat));
		if (cookieTable) out.cookieTable = { ...out.cookieTable, ...filled(cookieTable) };
		if (categories)
			for (const k of Object.keys(categories) as (keyof ConsentTexts['categories'])[])
				out.categories[k] = { ...out.categories[k], ...filled(categories[k] ?? {}) };
	}
	return out;
}
