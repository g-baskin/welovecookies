/**
 * We Love Cookies proof-of-consent log: one `consent_records` row per choice (never an IP address) and
 * cookieless daily counters in `consent_daily`. Records are kept 5 years, then purged.
 */
import type { Cookies } from '@sveltejs/kit';
import { lt, sql } from 'drizzle-orm';
import { getDb, schema } from '#lib/server/db/index.ts';
import { dayKey } from '#lib/server/analytics.ts';
import { newId } from '#lib/server/db/ids.ts';
import { MODE_RULES } from '#lib/consent/regions.ts';
import { encodeConsent, CONSENT_ID_RE, newConsentId } from '#lib/consent/cookie.ts';
import {
	CONSENT_COOKIE_NAME,
	LEGACY_CONSENT_COOKIE,
	type ConsentAction,
	type ConsentMode,
	type Device,
	type Grants,
	type StoredConsent
} from '#lib/consent/types.ts';

export const RETENTION_YEARS = 5;
const DAY_MS = 86_400_000;
export const RETENTION_MS = RETENTION_YEARS * 365 * DAY_MS + 2 * DAY_MS;

export const CONSENT_METRICS = [
	'seen',
	'accept_all',
	'reject_all',
	'custom',
	'acknowledge',
	'withdraw',
	'gpc'
] as const;
export type ConsentMetric = (typeof CONSENT_METRICS)[number];

/** Rough device class from the user agent (for choices posted without one). */
export function deviceOf(userAgent: string | null): Device {
	const ua = userAgent ?? '';
	if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
	if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'phone';
	return 'desktop';
}

export async function bumpConsentDaily(
	metric: ConsentMetric,
	mode: ConsentMode,
	country: string | null,
	device: Device,
	now = Date.now()
) {
	const t = schema.consentDaily;
	await getDb()
		.insert(t)
		.values({ day: dayKey(now), metric, mode, country: country ?? '', device, count: 1 })
		.onConflictDoUpdate({
			target: [t.day, t.metric, t.mode, t.country, t.device],
			set: { count: sql`${t.count} + 1` }
		})
		.run();
}

/** Same counters for another website using the banner (`consent_site_daily`). */
export async function bumpConsentSiteDaily(
	site: string,
	metric: ConsentMetric,
	mode: ConsentMode,
	country: string | null,
	device: Device,
	now = Date.now()
) {
	const t = schema.consentSiteDaily;
	await getDb()
		.insert(t)
		.values({ day: dayKey(now), site, metric, mode, country: country ?? '', device, count: 1 })
		.onConflictDoUpdate({
			target: [t.day, t.site, t.metric, t.mode, t.country, t.device],
			set: { count: sql`${t.count} + 1` }
		})
		.run();
}

/** Drops the old ads-only wlc_consent_v0 cookie (the banner script now writes wlc_consent itself). */
export function clearLegacyConsentCookie(event: { cookies: Pick<Cookies, 'delete'> }) {
	event.cookies.delete(LEGACY_CONSENT_COOKIE, { path: '/' });
}

/** Writes the wlc_consent cookie (readable by the banner script, so not httpOnly) and drops wlc_consent_v0. */
export function writeConsentCookie(
	event: { cookies: Pick<Cookies, 'set' | 'delete'>; url: URL },
	consent: StoredConsent
) {
	event.cookies.set(CONSENT_COOKIE_NAME, encodeConsent(consent), {
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		secure: event.url.protocol === 'https:',
		maxAge: MODE_RULES[consent.mode].maxAgeDays * 86_400
	});
	event.cookies.delete(LEGACY_CONSENT_COOKIE, { path: '/' });
}

export const validConsentId = (id: unknown): string =>
	typeof id === 'string' && CONSENT_ID_RE.test(id) ? id : newConsentId();

export interface ConsentRecordInput {
	consent: StoredConsent;
	country: string | null;
	regionCode: string | null;
	lang: string;
	device: Device;
	gpc: boolean;
	page: string;
	userAgent: string | null;
	customerId: string | null;
	/** '' or absent = this store; otherwise the other website's key. */
	site?: string;
}

export async function insertConsentRecord(r: ConsentRecordInput) {
	const g: Grants = r.consent.grants;
	await getDb()
		.insert(schema.consentRecords)
		.values({
			id: newId('ccr'),
			consentId: r.consent.id,
			createdAt: r.consent.at,
			action: r.consent.action satisfies ConsentAction,
			preferences: +g.preferences,
			analytics: +g.analytics,
			marketing: +g.marketing,
			mode: r.consent.mode,
			country: r.country,
			regionCode: r.regionCode,
			rev: r.consent.rev,
			lang: r.lang.slice(0, 12),
			device: r.device,
			gpc: +r.gpc,
			page: r.page.slice(0, 200),
			userAgent: (r.userAgent ?? '').slice(0, 200),
			customerId: r.customerId,
			site: r.site ?? ''
		})
		.run();
}

/** Deletes records and counters older than 5 years. */
export async function purgeOldConsent(now = Date.now()) {
	const cutoff = now - RETENTION_MS;
	const db = getDb();
	await db.delete(schema.consentRecords).where(lt(schema.consentRecords.createdAt, cutoff)).run();
	await db
		.delete(schema.consentDaily)
		.where(lt(schema.consentDaily.day, dayKey(cutoff)))
		.run();
	await db
		.delete(schema.consentSiteDaily)
		.where(lt(schema.consentSiteDaily.day, dayKey(cutoff)))
		.run();
}
