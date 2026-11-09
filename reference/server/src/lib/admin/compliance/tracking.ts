import { z } from 'zod';
import { ALL_PARTY_STATES_CHECKED } from '#lib/consent/wiretap.ts';

/**
 * Tracking and privacy check: rules only, no AI, no outside calls. The Compliance reviewer runs it
 * on the owner's schedule (off, daily or weekly at TRACKING_HOUR store time) and on Check now.
 */
export const TRACKING_CADENCES = ['off', 'daily', 'weekly'] as const;
export type TrackingCadence = (typeof TRACKING_CADENCES)[number];
export const TRACKING_HOUR = 9;
export const VENDOR_RECHECK_DAYS = 365;
export const STATE_LIST_RECHECK_DAYS = 180;
const DAY = 86_400_000;

export interface TrackingFacts {
	bannerOn: boolean;
	privacyPolicy: boolean;
	pixelListed: boolean;
	vendorOnFileAt: number | null;
}

export const trackingIssueSchema = z.object({
	id: z.string(),
	level: z.enum(['fix', 'check']),
	text: z.string(),
	href: z.string().nullable()
});
export type TrackingIssue = z.infer<typeof trackingIssueSchema>;
export const trackingResultSchema = z.object({
	at: z.number(),
	period: z.string().nullable(),
	issues: z.array(trackingIssueSchema)
});
export type TrackingResult = z.infer<typeof trackingResultSchema>;

export function trackingIssues(f: TrackingFacts, now: number): TrackingIssue[] {
	const out: TrackingIssue[] = [];
	if (!f.privacyPolicy)
		out.push({
			id: 'privacy_policy',
			level: 'fix',
			text: 'No privacy policy is published. Shoppers must be able to read who receives their data, including the visitor ID pixel company.',
			href: '/admin/privacy'
		});
	if (!f.bannerOn)
		out.push({
			id: 'banner_off',
			level: 'check',
			text: 'The cookie banner is off, so the visitor ID pixel never loads. Turn the banner on if you want the pixel to work.',
			href: '/admin/privacy'
		});
	if (!f.pixelListed)
		out.push({
			id: 'pixel_not_listed',
			level: 'fix',
			text: 'The visitor ID pixel is not in your cookie list, so shoppers can’t see who it is. Add it under Marketing.',
			href: '/admin/privacy'
		});
	if (f.vendorOnFileAt === null || now - f.vendorOnFileAt > VENDOR_RECHECK_DAYS * DAY)
		out.push({
			id: 'vendor_details',
			level: 'check',
			text:
				f.vendorOnFileAt === null
					? 'Get the visitor ID pixel company’s legal name, privacy policy and data agreement, then press “I have their details on file”.'
					: 'It has been over a year since you checked the visitor ID pixel company’s privacy policy and data agreement. Check them again.',
			href: null
		});
	if (now - Date.parse(`${ALL_PARTY_STATES_CHECKED}T00:00:00Z`) > STATE_LIST_RECHECK_DAYS * DAY)
		out.push({
			id: 'state_list',
			level: 'check',
			text: `The list of US states where the pixel needs a click was last checked on ${ALL_PARTY_STATES_CHECKED}. Wiretap rules change; ask a developer to re-check it.`,
			href: null
		});
	return out;
}

const shiftDay = (day: string, days: number) =>
	new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

/**
 * The schedule period that is open now (its start day), or null before the first slot. Weekly
 * periods start Monday at TRACKING_HOUR; a missed slot is caught up later in the same period.
 */
export function trackingPeriod(
	cadence: TrackingCadence,
	local: { day: string; weekday: number; hour: number }
): string | null {
	if (cadence === 'daily') return local.hour >= TRACKING_HOUR ? local.day : null;
	if (cadence === 'weekly') {
		if (local.weekday === 1 && local.hour < TRACKING_HOUR) return null;
		return shiftDay(local.day, -((local.weekday + 6) % 7));
	}
	return null;
}

export function describeCadence(cadence: TrackingCadence): string {
	if (cadence === 'daily') return `Every day at ${TRACKING_HOUR}:00 (store time)`;
	if (cadence === 'weekly') return `Every Monday at ${TRACKING_HOUR}:00 (store time)`;
	return 'Off';
}

export function trackingSummary(issues: readonly TrackingIssue[]): string {
	const fix = issues.filter((i) => i.level === 'fix').length;
	const check = issues.length - fix;
	if (!issues.length) return 'Tracking check: nothing to fix.';
	const parts = [fix && `${fix} to fix`, check && `${check} to check`].filter(Boolean);
	return `Tracking check: ${parts.join(', ')}.`;
}
