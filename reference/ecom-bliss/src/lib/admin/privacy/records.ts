/** Ecom Cookie admin: reading the overview counters and the proof-of-consent log. */
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { getDb, schema } from '#lib/server/db/index.ts';
import { dayKey } from '#lib/server/analytics.ts';
import { summarize, type DailyRow, type Overview } from './display.ts';

const DAY_MS = 86_400_000;
const BANNER_ACTIONS = ['accept_all', 'reject_all', 'custom'];

/** Overview for this store (site '') or one other website (its key). */
export async function readOverview(days: number, now = Date.now(), site = ''): Promise<Overview> {
	const db = getDb();
	const d = schema.consentDaily;
	const r = schema.consentRecords;
	const from = now - days * DAY_MS;
	const sd = schema.consentSiteDaily;
	const daily = site
		? db
				.select({
					metric: sd.metric,
					mode: sd.mode,
					country: sd.country,
					device: sd.device,
					n: sql<number>`sum(${sd.count})`
				})
				.from(sd)
				.where(and(eq(sd.site, site), gte(sd.day, dayKey(from))))
				.groupBy(sd.metric, sd.mode, sd.country, sd.device)
				.all()
		: null;
	const [rows, opt] = await Promise.all([
		daily ??
			db
				.select({
					metric: d.metric,
					mode: d.mode,
					country: d.country,
					device: d.device,
					n: sql<number>`sum(${d.count})`
				})
				.from(d)
				.where(gte(d.day, dayKey(from)))
				.groupBy(d.metric, d.mode, d.country, d.device)
				.all(),
		db
			.select({
				of: sql<number>`count(*)`,
				allowed: sql<number>`coalesce(sum(case when ${r.analytics} = 1 or ${r.marketing} = 1 then 1 else 0 end), 0)`
			})
			.from(r)
			.where(
				and(
					gte(r.createdAt, from),
					eq(r.site, site),
					sql`${r.action} in (${sql.join(
						BANNER_ACTIONS.map((a) => sql`${a}`),
						sql`, `
					)})`
				)
			)
			.get()
	]);
	return summarize(rows as DailyRow[], {
		allowed: Number(opt?.allowed ?? 0),
		of: Number(opt?.of ?? 0)
	});
}

export type ConsentRecordRow = typeof schema.consentRecords.$inferSelect;

/** Latest records, or every record for one consent ID. */
/** Record columns plus the signed-in customer's email (shown instead of an internal id). */
const withEmail = () => {
	const r = schema.consentRecords;
	return getDb()
		.select({
			id: r.id,
			consentId: r.consentId,
			createdAt: r.createdAt,
			action: r.action,
			preferences: r.preferences,
			analytics: r.analytics,
			marketing: r.marketing,
			mode: r.mode,
			country: r.country,
			regionCode: r.regionCode,
			rev: r.rev,
			lang: r.lang,
			device: r.device,
			gpc: r.gpc,
			page: r.page,
			userAgent: r.userAgent,
			site: r.site,
			customerEmail: schema.customers.email
		})
		.from(r)
		.leftJoin(schema.customers, eq(schema.customers.id, r.customerId));
};

export async function readRecords(consentId: string | null, limit = 100) {
	const r = schema.consentRecords;
	return withEmail()
		.where(consentId ? eq(r.consentId, consentId) : undefined)
		.orderBy(desc(r.createdAt), desc(r.id))
		.limit(limit)
		.all();
}

export async function recordsBetween(fromMs: number, toMs: number, limit = 50_000) {
	const r = schema.consentRecords;
	return withEmail()
		.where(and(gte(r.createdAt, fromMs), lte(r.createdAt, toMs)))
		.orderBy(r.createdAt, r.id)
		.limit(limit)
		.all();
}
