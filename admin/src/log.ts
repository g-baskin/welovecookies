// Reading the consent log and counters, and the 5-year retention purge.
import { DAY_MS, dayKey, type Db } from './db.ts';
import { groupOf, REGION_GROUPS, type RegionGroup } from './labels.ts';

export const RETENTION_YEARS = 5;
export const RETENTION_MS = RETENTION_YEARS * 365 * DAY_MS + 2 * DAY_MS;
export const CSV_MAX_ROWS = 100_000;

export interface RecordRow {
	id: number;
	site: string;
	consent_id: string;
	created_at: number;
	action: string;
	preferences: number;
	analytics: number;
	marketing: number;
	mode: string;
	country: string | null;
	region_code: string | null;
	rev: number;
	lang: string;
	device: string;
	gpc: number;
	page: string;
	user_agent: string;
}

export async function recordsForConsentId(
	db: Db,
	site: string,
	consentId: string
): Promise<RecordRow[]> {
	return (
		await db
			.prepare(
				'SELECT * FROM consent_records WHERE site = ? AND consent_id = ? ORDER BY created_at DESC LIMIT 200'
			)
			.bind(site, consentId)
			.all<RecordRow>()
	).results;
}

export async function recentRecords(db: Db, site: string, limit = 50): Promise<RecordRow[]> {
	return (
		await db
			.prepare('SELECT * FROM consent_records WHERE site = ? ORDER BY created_at DESC LIMIT ?')
			.bind(site, limit)
			.all<RecordRow>()
	).results;
}

/** Up to CSV_MAX_ROWS + 1 rows, so the caller can tell when the range holds too many. */
export async function recordsBetween(
	db: Db,
	site: string,
	from: number,
	to: number
): Promise<RecordRow[]> {
	return (
		await db
			.prepare(
				'SELECT * FROM consent_records WHERE site = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at LIMIT ?'
			)
			.bind(site, from, to, CSV_MAX_ROWS + 1)
			.all<RecordRow>()
	).results;
}

export interface Tally {
	seen: number;
	answered: number;
	acceptAll: number;
	rejectAll: number;
	custom: number;
	acknowledge: number;
	withdraw: number;
	gpc: number;
}
const empty = (): Tally => ({
	seen: 0,
	answered: 0,
	acceptAll: 0,
	rejectAll: 0,
	custom: 0,
	acknowledge: 0,
	withdraw: 0,
	gpc: 0
});

function add(t: Tally, metric: string, n: number) {
	if (metric === 'seen') t.seen += n;
	else if (metric === 'gpc') t.gpc += n;
	else if (metric === 'withdraw') t.withdraw += n;
	else if (
		metric === 'accept_all' ||
		metric === 'reject_all' ||
		metric === 'custom' ||
		metric === 'acknowledge'
	) {
		t.answered += n;
		if (metric === 'accept_all') t.acceptAll += n;
		else if (metric === 'reject_all') t.rejectAll += n;
		else if (metric === 'custom') t.custom += n;
		else t.acknowledge += n;
	}
}

export interface DailyRow {
	metric: string;
	mode: string;
	device: string;
	n: number;
}

export interface Overview {
	total: Tally;
	byRegion: { key: RegionGroup; label: string; hint: string; tally: Tally }[];
	byDevice: Record<string, Tally>;
}

export function tally(rows: readonly DailyRow[]): Overview {
	const total = empty();
	const region = new Map<RegionGroup, Tally>(REGION_GROUPS.map((g) => [g.key, empty()]));
	const byDevice: Record<string, Tally> = { phone: empty(), tablet: empty(), desktop: empty() };
	for (const r of rows) {
		add(total, r.metric, r.n);
		add(region.get(groupOf(r.mode))!, r.metric, r.n);
		if (byDevice[r.device]) add(byDevice[r.device], r.metric, r.n);
	}
	return {
		total,
		byRegion: REGION_GROUPS.map((g) => ({ ...g, tally: region.get(g.key)! })),
		byDevice
	};
}

/** Counters for the last `days` UTC days including today. */
export async function overview(
	db: Db,
	site: string,
	days: number,
	now = Date.now()
): Promise<Overview> {
	const from = dayKey(now - (days - 1) * DAY_MS);
	const rows = await db
		.prepare(
			'SELECT metric, mode, device, sum(count) AS n FROM consent_daily WHERE site = ? AND day >= ? GROUP BY metric, mode, device'
		)
		.bind(site, from)
		.all<DailyRow>();
	return tally(rows.results.map((r) => ({ ...r, n: Number(r.n) })));
}

/**
 * Deletes consent records and counters older than the retention period, and old failed sign-ins,
 * in fixed batches so one run never holds the database for long. Returns what was deleted.
 */
// D1 allows 50 queries per run on the free plan, so each table gets a few rounds a day; any rest waits for tomorrow.
export async function purgeOld(db: Db, now = Date.now(), batch = 5000, maxRounds = 8) {
	const cutoff = now - RETENTION_MS;
	const out = { records: 0, daily: 0, rateEvents: 0, more: false };
	const loop = async (sql: string, arg: string | number) => {
		let total = 0;
		for (let i = 0; i < maxRounds; i++) {
			const n = (await db.prepare(sql).bind(arg, batch).run()).meta.changes;
			total += n;
			if (n < batch) return total;
		}
		out.more = true;
		return total;
	};
	out.records = await loop(
		'DELETE FROM consent_records WHERE id IN (SELECT id FROM consent_records WHERE created_at < ? ORDER BY id LIMIT ?)',
		cutoff
	);
	out.daily = await loop(
		'DELETE FROM consent_daily WHERE rowid IN (SELECT rowid FROM consent_daily WHERE day < ? LIMIT ?)',
		dayKey(cutoff)
	);
	out.rateEvents = await loop(
		'DELETE FROM rate_events WHERE id IN (SELECT id FROM rate_events WHERE at < ? LIMIT ?)',
		now - DAY_MS
	);
	return out;
}
