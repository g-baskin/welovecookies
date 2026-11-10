// Tracking & compliance check: rules only, no outside calls, no vendor-specific pixel. Runs daily
// from the cron and on "Check now". Engineering reminders, not legal advice.
import { REGIONS_CHECKED } from '../../src/lib/consent/regions.ts';
import type { ConsentCategory, ConsentIntegrations } from '../../src/lib/consent/types.ts';
import { ALL_PARTY_STATES_CHECKED } from '../../src/lib/consent/wiretap.ts';
import { DAY_MS, dayKey, type Db, type SiteRow } from './db.ts';
import { CATEGORY_LABEL } from './labels.ts';
import { INTEGRATIONS, siteSettings, type SiteSettings } from './settings.ts';

export const STATE_LIST_RECHECK_DAYS = 180;
export const REGIONS_RECHECK_DAYS = 365;
export const NO_VIEWS_DAYS = 7;

/** Which cookie-list categories each integration's cookies belong to (any one is enough). */
export const INTEGRATION_CATEGORIES: Record<keyof ConsentIntegrations, ConsentCategory[]> = {
	googleConsentMode: ['analytics', 'marketing'],
	microsoftUet: ['marketing'],
	meta: ['marketing'],
	tiktok: ['marketing'],
	posthog: ['analytics'],
	scriptBlocking: [],
	knownTrackers: []
};

export interface TrackingFacts {
	site: Pick<SiteRow, 'key' | 'enabled' | 'privacy_url' | 'created_at'>;
	settings: SiteSettings;
	overdueRequests: number;
	/** Banner views plus recorded choices in the last NO_VIEWS_DAYS days. */
	activity: number;
}

export interface TrackingIssue {
	id: string;
	level: 'fix' | 'check';
	text: string;
	href: string | null;
}

const daysSince = (isoDay: string, now: number) =>
	(now - Date.parse(`${isoDay}T00:00:00Z`)) / DAY_MS;

export function trackingIssues(f: TrackingFacts, now: number): TrackingIssue[] {
	const out: TrackingIssue[] = [];
	const q = `?site=${f.site.key}`;
	const s = f.settings;
	if (!f.site.privacy_url)
		out.push({
			id: 'privacy_policy',
			level: 'fix',
			text: 'No privacy policy link. Visitors must be able to read who receives their data. Add the link to this website.',
			href: `/admin/sites${q}`
		});
	if (!s.enabled)
		out.push({
			id: 'banner_off',
			level: 'check',
			text: 'The banner is switched off here, so the script shows only its basic built-in banner, with none of your wording and no records kept.',
			href: `/admin/banner${q}`
		});
	if (!s.cookies.length)
		out.push({
			id: 'cookies_empty',
			level: 'fix',
			text: 'The cookie list is empty. List every cookie this website sets so visitors can see what each one does.',
			href: `/admin/cookies${q}`
		});
	for (const { key, label } of INTEGRATIONS) {
		const cats = INTEGRATION_CATEGORIES[key];
		if (!s.integrations[key] || !cats.length) continue;
		if (!s.cookies.some((c) => cats.includes(c.category)))
			out.push({
				id: `unlisted_${key}`,
				level: 'fix',
				text: `${label} is switched on, but the cookie list has no ${cats.map((c) => CATEGORY_LABEL[c]).join(' or ')} cookies. Add the cookies it sets, or switch it off.`,
				href: `/admin/cookies${q}`
			});
	}
	if (f.overdueRequests > 0)
		out.push({
			id: 'overdue_requests',
			level: 'fix',
			text: `${f.overdueRequests} privacy request${f.overdueRequests === 1 ? ' is' : 's are'} past the answer date.`,
			href: `/admin/requests${q}`
		});
	if (
		f.site.enabled &&
		s.enabled &&
		now - f.site.created_at > NO_VIEWS_DAYS * DAY_MS &&
		f.activity === 0
	)
		out.push({
			id: 'no_views',
			level: 'check',
			text: `No banner views or choices in the last ${NO_VIEWS_DAYS} days. Check the script tag is still on the website and uses this website's key.`,
			href: `/admin/sites${q}`
		});
	if (daysSince(ALL_PARTY_STATES_CHECKED, now) > STATE_LIST_RECHECK_DAYS)
		out.push({
			id: 'state_list',
			level: 'check',
			text: `The list of US all-party-consent (wiretap) states was last checked on ${ALL_PARTY_STATES_CHECKED}. Update We Love Cookies, or ask a developer to re-check it.`,
			href: null
		});
	if (daysSince(REGIONS_CHECKED, now) > REGIONS_RECHECK_DAYS)
		out.push({
			id: 'regions_list',
			level: 'check',
			text: `The country and US state rules were last checked on ${REGIONS_CHECKED}. Privacy laws change; update We Love Cookies, or ask a developer to re-check them.`,
			href: null
		});
	return out;
}

/** Facts for several sites in three queries, whatever the number of sites. */
export async function gatherFacts(
	db: Db,
	sites: SiteRow[],
	now = Date.now()
): Promise<TrackingFacts[]> {
	const since = now - NO_VIEWS_DAYS * DAY_MS;
	const [overdue, views, records] = await Promise.all([
		db
			.prepare(
				"SELECT site, count(*) AS n FROM privacy_requests WHERE status IN ('new', 'in_progress') AND due_at / 86400000 < ? GROUP BY site"
			)
			.bind(Math.floor(now / DAY_MS))
			.all<{ site: string; n: number }>(),
		db
			.prepare('SELECT site, sum(count) AS n FROM consent_daily WHERE day >= ? GROUP BY site')
			.bind(dayKey(since))
			.all<{ site: string; n: number }>(),
		db
			.prepare(
				'SELECT site, count(*) AS n FROM consent_records WHERE created_at >= ? GROUP BY site'
			)
			.bind(since)
			.all<{ site: string; n: number }>()
	]);
	const by = (r: { results: { site: string; n: number }[] }) =>
		new Map(r.results.map((x) => [x.site, Number(x.n)]));
	const [o, v, r] = [by(overdue), by(views), by(records)];
	return sites.map((site) => ({
		site,
		settings: siteSettings(site),
		overdueRequests: o.get(site.key) ?? 0,
		activity: (v.get(site.key) ?? 0) + (r.get(site.key) ?? 0)
	}));
}

/** Runs the check for these sites and stores every result in one batch. */
export async function runChecks(
	db: Db,
	sites: SiteRow[],
	now = Date.now()
): Promise<Map<string, TrackingIssue[]>> {
	const out = new Map<string, TrackingIssue[]>();
	if (!sites.length) return out;
	for (const f of await gatherFacts(db, sites, now)) out.set(f.site.key, trackingIssues(f, now));
	await db.batch(
		[...out].map(([key, issues]) =>
			db
				.prepare(
					'INSERT INTO check_results (site, at, issues_json) VALUES (?, ?, ?) ON CONFLICT (site) DO UPDATE SET at = excluded.at, issues_json = excluded.issues_json'
				)
				.bind(key, now, JSON.stringify(issues))
		)
	);
	return out;
}

export const runCheck = async (db: Db, site: SiteRow, now = Date.now()) =>
	(await runChecks(db, [site], now)).get(site.key) ?? [];

/** Latest stored result for every site, in one query. */
export async function allLatestChecks(
	db: Db
): Promise<Map<string, { at: number; issues: TrackingIssue[] }>> {
	const rows = await db
		.prepare('SELECT site, at, issues_json FROM check_results')
		.all<{ site: string; at: number; issues_json: string }>();
	return new Map(
		rows.results.map((row) => [row.site, { at: row.at, issues: parseIssues(row.issues_json) }])
	);
}

function parseIssues(json: string): TrackingIssue[] {
	try {
		const v: unknown = JSON.parse(json);
		return Array.isArray(v) ? (v as TrackingIssue[]) : [];
	} catch {
		return [];
	}
}

export async function latestCheck(
	db: Db,
	key: string
): Promise<{ at: number; issues: TrackingIssue[] } | null> {
	const row = await db
		.prepare('SELECT at, issues_json FROM check_results WHERE site = ?')
		.bind(key)
		.first<{ at: number; issues_json: string }>();
	return row ? { at: row.at, issues: parseIssues(row.issues_json) } : null;
}

export function trackingSummary(issues: readonly TrackingIssue[]): string {
	if (!issues.length) return 'Nothing to fix.';
	const fix = issues.filter((i) => i.level === 'fix').length;
	const check = issues.length - fix;
	return [fix && `${fix} to fix`, check && `${check} to check`].filter(Boolean).join(', ') + '.';
}
