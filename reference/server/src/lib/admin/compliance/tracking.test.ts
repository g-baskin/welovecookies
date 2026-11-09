import { describe, expect, it } from 'vitest';
import { trackingIssues, trackingPeriod, trackingSummary, type TrackingFacts } from './tracking.ts';

const NOW = Date.UTC(2026, 10, 3);
const DAY = 86_400_000;
const GOOD: TrackingFacts = {
	bannerOn: true,
	privacyPolicy: true,
	pixelListed: true,
	vendorOnFileAt: NOW - DAY
};
const ids = (f: Partial<TrackingFacts>, now = NOW) =>
	trackingIssues({ ...GOOD, ...f }, now).map((i) => i.id);

describe('tracking check rules', () => {
	it('finds nothing when the setup is complete', () => {
		expect(ids({})).toEqual([]);
		expect(trackingSummary([])).toBe('Tracking check: nothing to fix.');
	});
	it('flags each missing piece with a plain fix', () => {
		expect(
			ids({ privacyPolicy: false, bannerOn: false, pixelListed: false, vendorOnFileAt: null })
		).toEqual(['privacy_policy', 'banner_off', 'pixel_not_listed', 'vendor_details']);
		const issues = trackingIssues({ ...GOOD, privacyPolicy: false, vendorOnFileAt: null }, NOW);
		expect(trackingSummary(issues)).toBe('Tracking check: 1 to fix, 1 to check.');
	});
	it('asks again after a year for vendor details and after 180 days for the state list', () => {
		expect(ids({ vendorOnFileAt: NOW - 366 * DAY })).toEqual(['vendor_details']);
		expect(ids({ vendorOnFileAt: NOW + 170 * DAY }, NOW + 181 * DAY)).toEqual(['state_list']);
	});
});

describe('tracking schedule', () => {
	it('weekly periods start Monday at 09:00 and run through Sunday', () => {
		expect(trackingPeriod('weekly', { day: '2026-11-02', weekday: 1, hour: 8 })).toBeNull();
		expect(trackingPeriod('weekly', { day: '2026-11-02', weekday: 1, hour: 9 })).toBe('2026-11-02');
		expect(trackingPeriod('weekly', { day: '2026-11-05', weekday: 4, hour: 3 })).toBe('2026-11-02');
		expect(trackingPeriod('weekly', { day: '2026-11-08', weekday: 0, hour: 23 })).toBe(
			'2026-11-02'
		);
		expect(trackingPeriod('weekly', { day: '2026-11-09', weekday: 1, hour: 10 })).toBe(
			'2026-11-09'
		);
	});
	it('daily periods start each day at 09:00; off never runs', () => {
		expect(trackingPeriod('daily', { day: '2026-11-03', weekday: 2, hour: 8 })).toBeNull();
		expect(trackingPeriod('daily', { day: '2026-11-03', weekday: 2, hour: 9 })).toBe('2026-11-03');
		expect(trackingPeriod('off', { day: '2026-11-03', weekday: 2, hour: 12 })).toBeNull();
	});
});
