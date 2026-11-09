import { describe, expect, it } from 'vitest';
import { decodeConsent, encodeConsent, newConsentId, readCookie } from './cookie.ts';
import {
	bannerFor,
	effectiveGrants,
	modeFor,
	modeFromTimeZone,
	REGIONS_CHECKED
} from './regions.ts';
import type { StoredConsent } from './types.ts';

const NOW = Date.UTC(2026, 10, 3);
const saved = (over: Partial<StoredConsent> = {}): StoredConsent => ({
	id: newConsentId(),
	at: NOW - 1000,
	mode: 'opt-in',
	rev: 1,
	grants: { preferences: false, analytics: true, marketing: false },
	action: 'custom',
	...over
});

describe('consent cookie', () => {
	it('round-trips and rejects junk', () => {
		const c = saved();
		expect(c.id).toMatch(/^[A-Za-z0-9_-]{16}$/);
		expect(decodeConsent(encodeConsent(c))).toEqual(c);
		for (const bad of [
			'',
			'x',
			'1.short.1.1.i.011.c',
			'2.' + c.id + '.1.1.i.011.c',
			encodeConsent(c).replace('.i.', '.z.')
		])
			expect(decodeConsent(bad)).toBeNull();
		expect(readCookie(`a=1; wlc_consent=${encodeConsent(c)}; b=2`, 'wlc_consent')).toBe(
			encodeConsent(c)
		);
	});
});

describe('region modes', () => {
	it('maps countries, US states, Quebec and unknowns', () => {
		expect(modeFor('DE')).toBe('opt-in');
		expect(modeFor('GB')).toBe('opt-in-uk');
		expect(modeFor('US', 'CA')).toBe('opt-out-gpc');
		expect(modeFor('US', 'VA')).toBe('opt-out');
		expect(modeFor('US', 'NY')).toBe('notice');
		expect(modeFor('US')).toBe('opt-out-gpc');
		expect(modeFor('CA', 'QC')).toBe('opt-in');
		expect(modeFor('CA', 'ON')).toBe('opt-out');
		expect(modeFor('JP')).toBe('notice');
		expect(modeFor(null)).toBe('opt-in');
		expect(modeFor('XX')).toBe('opt-in');
		expect(modeFor('ZZ')).toBe('opt-in');
		expect(modeFor('US', 'NY', ['US'])).toBe('opt-in');
	});
	it('guesses from the time zone, erring to opt-in', () => {
		expect(modeFromTimeZone('Europe/Paris')).toBe('opt-in');
		expect(modeFromTimeZone('America/Chicago')).toBe('opt-out-gpc');
		expect(modeFromTimeZone('Asia/Kolkata')).toBe('opt-in');
		expect(modeFromTimeZone(undefined)).toBe('opt-in');
	});
});

describe('grants and banner', () => {
	it('opt-in: nothing before a choice, the saved choice after', () => {
		expect(effectiveGrants('opt-in', null, 1, false, NOW)).toEqual({
			preferences: false,
			analytics: false,
			marketing: false
		});
		expect(bannerFor('opt-in', null, 1, {}, NOW)).toBe('full');
		expect(effectiveGrants('opt-in', saved(), 1, false, NOW).analytics).toBe(true);
		expect(bannerFor('opt-in', saved(), 1, {}, NOW)).toBeNull();
	});
	it('asks again after a new revision, after 180 days, or when arriving from an opt-out region', () => {
		expect(bannerFor('opt-in', saved(), 2, {}, NOW)).toBe('full');
		expect(bannerFor('opt-in', saved({ at: NOW - 181 * 86_400_000 }), 1, {}, NOW)).toBe('full');
		const us = saved({
			mode: 'opt-out-gpc',
			action: 'acknowledge',
			grants: { preferences: true, analytics: true, marketing: true }
		});
		expect(bannerFor('opt-in', us, 1, {}, NOW)).toBe('full');
		expect(effectiveGrants('opt-in', us, 1, false, NOW).marketing).toBe(false);
	});
	it('opt-out: allowed by default, GPC turns marketing off, short notice once', () => {
		expect(effectiveGrants('opt-out-gpc', null, 1, false, NOW).marketing).toBe(true);
		expect(effectiveGrants('opt-out-gpc', null, 1, true, NOW).marketing).toBe(false);
		expect(
			effectiveGrants(
				'opt-in',
				saved({ grants: { preferences: true, analytics: true, marketing: true } }),
				1,
				true,
				NOW
			).marketing
		).toBe(false);
		expect(bannerFor('opt-out-gpc', null, 1, {}, NOW)).toBe('notice');
		expect(
			bannerFor('opt-out-gpc', null, 1, { noticeBanner: { optOut: false, notice: false } }, NOW)
		).toBeNull();
		expect(bannerFor('notice', null, 1, {}, NOW)).toBeNull();
		expect(
			bannerFor('notice', null, 1, { noticeBanner: { optOut: true, notice: true } }, NOW)
		).toBe('notice');
	});
});

describe('wording overrides', async () => {
	const { textsFor } = await import('./i18n.ts');
	it('override any field per language, blanks fall back to built-in text', () => {
		const t = textsFor('de', {
			'*': { acceptAll: '' },
			de: { title: 'Hallo', categories: { analytics: { title: 'Statistik' } } }
		});
		expect(t.title).toBe('Hallo');
		expect(t.acceptAll.length).toBeGreaterThan(0);
		expect(t.categories.analytics.title).toBe('Statistik');
		expect(t.categories.analytics.description.length).toBeGreaterThan(0);
	});
});

it('REGIONS_CHECKED is a real past ISO date (the admin tracking check reads it)', () => {
	expect(REGIONS_CHECKED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	const t = Date.parse(`${REGIONS_CHECKED}T00:00:00Z`);
	expect(Number.isFinite(t)).toBe(true);
	expect(t).toBeLessThanOrEqual(Date.now());
});
