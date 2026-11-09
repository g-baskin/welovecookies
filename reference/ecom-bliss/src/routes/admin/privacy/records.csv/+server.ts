import { error } from '@sveltejs/kit';
import { toCsv } from '#lib/admin/csv.ts';
import { recordsBetween } from '#lib/admin/privacy/records.ts';
import { getSetting } from '#lib/server/settings.ts';
import { siteNames, websiteLabel } from '#lib/server/consent/sites.ts';
import {
	ACTION_LABEL,
	browserName,
	DEVICE_NAME,
	languageName,
	MODE_LABEL,
	placeName,
	yesNo
} from '#lib/admin/privacy/display.ts';
import type { RequestHandler } from './$types';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Proof-of-consent records for a date range (UTC days, inclusive) as CSV. No IP addresses exist. */
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.adminId) error(401, 'Sign in to export consent records.');
	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';
	if (!DAY.test(from) || !DAY.test(to)) error(400, 'Choose a start and end date.');
	const rows = await recordsBetween(
		Date.parse(`${from}T00:00:00Z`),
		Date.parse(`${to}T23:59:59.999Z`)
	);
	const [names, storeName] = await Promise.all([
		siteNames(),
		getSetting<string | null>('store.name', null)
	]);
	const csv = toCsv(
		[
			'Date and time (UTC)',
			'Reference',
			'Choice',
			'Preferences',
			'Statistics',
			'Marketing',
			'Rules that applied',
			'Place',
			'Banner version',
			'Language',
			'Device',
			'Browser privacy signal',
			'Page',
			'Browser',
			'Signed-in customer',
			'Website'
		],
		rows.map((r) => [
			new Date(r.createdAt).toISOString().replace('T', ' ').slice(0, 19),
			r.consentId,
			ACTION_LABEL[r.action] ?? 'Other',
			yesNo(r.preferences),
			yesNo(r.analytics),
			yesNo(r.marketing),
			MODE_LABEL[r.mode] ?? 'Other',
			placeName(r.country, r.regionCode),
			r.rev,
			languageName(r.lang),
			DEVICE_NAME[r.device] ?? 'Unknown',
			yesNo(r.gpc),
			r.page,
			browserName(r.userAgent),
			r.customerEmail ?? '',
			websiteLabel(r.site, names, storeName || 'This store')
		])
	);
	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="consent-records-${from}-to-${to}.csv"`,
			'cache-control': 'private, no-store'
		}
	});
};
