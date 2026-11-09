/**
 * We Love Cookies: proof-of-consent log, cookieless daily banner counters and the banner versions shown.
 * No IP address is ever stored. Rows older than 5 years are purged (src/lib/server/consent/log.ts).
 */
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const consentRecords = sqliteTable(
	'consent_records',
	{
		id: text('id').primaryKey(),
		consentId: text('consent_id').notNull(),
		createdAt: integer('created_at').notNull(),
		action: text('action').notNull(),
		preferences: integer('preferences').notNull().default(0),
		analytics: integer('analytics').notNull().default(0),
		marketing: integer('marketing').notNull().default(0),
		mode: text('mode').notNull(),
		country: text('country'),
		regionCode: text('region_code'),
		rev: integer('rev').notNull().default(1),
		lang: text('lang').notNull().default(''),
		device: text('device').notNull().default('desktop'),
		gpc: integer('gpc').notNull().default(0),
		page: text('page').notNull().default(''),
		userAgent: text('user_agent').notNull().default(''),
		customerId: text('customer_id'),
		/** '' = this store; otherwise the consent_sites.id of another website using the banner. */
		site: text('site').notNull().default('')
	},
	(t) => [
		index('consent_records_consent_idx').on(t.consentId),
		index('consent_records_created_idx').on(t.createdAt)
	]
);

export const consentDaily = sqliteTable(
	'consent_daily',
	{
		day: text('day').notNull(),
		metric: text('metric').notNull(),
		mode: text('mode').notNull(),
		country: text('country').notNull().default(''),
		device: text('device').notNull().default(''),
		count: integer('count').notNull().default(0)
	},
	(t) => [primaryKey({ columns: [t.day, t.metric, t.mode, t.country, t.device] })]
);

export const consentVersions = sqliteTable('consent_versions', {
	rev: integer('rev').primaryKey(),
	createdAt: integer('created_at').notNull(),
	textsJson: text('texts_json').notNull(),
	cookiesJson: text('cookies_json').notNull()
});

/** Other websites that use this store's banner (hosted install, managed in Privacy & cookies). */
export const consentSites = sqliteTable('consent_sites', {
	/** Public site key used in the install snippet. */
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	/** Exact website origin allowed to load the config and send records, e.g. https://example.com */
	origin: text('origin').notNull(),
	privacyUrl: text('privacy_url').notNull().default(''),
	/** Null = use the store's cookie list; otherwise this site's own list (CookieInfo[] JSON). */
	cookiesJson: text('cookies_json'),
	enabled: integer('enabled').notNull().default(1),
	createdAt: integer('created_at').notNull()
});

/** Cookieless daily counters for other websites (same shape as consent_daily plus the site). */
export const consentSiteDaily = sqliteTable(
	'consent_site_daily',
	{
		day: text('day').notNull(),
		site: text('site').notNull(),
		metric: text('metric').notNull(),
		mode: text('mode').notNull(),
		country: text('country').notNull().default(''),
		device: text('device').notNull().default(''),
		count: integer('count').notNull().default(0)
	},
	(t) => [primaryKey({ columns: [t.day, t.site, t.metric, t.mode, t.country, t.device] })]
);

/** Shopper privacy requests (delete my data, send me a copy, correct it, stop selling/sharing). */
export const privacyRequests = sqliteTable(
	'privacy_requests',
	{
		id: text('id').primaryKey(),
		createdAt: integer('created_at').notNull(),
		kind: text('kind').notNull(),
		status: text('status').notNull().default('new'),
		email: text('email').notNull(),
		name: text('name').notNull().default(''),
		message: text('message').notNull().default(''),
		consentId: text('consent_id'),
		customerId: text('customer_id'),
		country: text('country'),
		regionCode: text('region_code'),
		/** When the answer is due (ms), from the strictest law that applies. */
		dueAt: integer('due_at').notNull(),
		closedAt: integer('closed_at'),
		/** Owner's private note. */
		note: text('note').notNull().default(''),
		site: text('site').notNull().default('')
	},
	(t) => [
		index('privacy_requests_created_idx').on(t.createdAt),
		index('privacy_requests_status_idx').on(t.status)
	]
);
