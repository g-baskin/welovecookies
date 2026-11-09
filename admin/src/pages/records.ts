import { CONSENT_ID_RE } from '../../../src/lib/consent/cookie.ts';
import { toCsv } from '../csv.ts';
import { DAY_MS, dayKey } from '../db.ts';
import { html } from '../html.ts';
import {
	ACTION_LABEL,
	browserName,
	DEVICE_LABEL,
	MODE_LABEL,
	placeName,
	utc,
	yesNo
} from '../labels.ts';
import {
	CSV_MAX_ROWS,
	recentRecords,
	recordsBetween,
	recordsForConsentId,
	RETENTION_YEARS,
	type RecordRow
} from '../log.ts';
import { adminPage, noSitePrompt, type Ctx } from './layout.ts';

const table = (rows: RecordRow[]) =>
	rows.length
		? html`<table><thead><tr><th scope="col">When (UTC)</th><th scope="col">Reference</th><th scope="col">Choice</th><th scope="col">Preferences / Statistics / Marketing</th><th scope="col">Rules</th><th scope="col">Place</th><th scope="col">Version</th><th scope="col">Device</th><th scope="col">Page</th></tr></thead><tbody>${rows.map(
				(r) =>
					html`<tr><td>${utc(r.created_at)}</td><td><code>${r.consent_id}</code></td><td>${ACTION_LABEL[r.action] ?? r.action}${r.gpc ? html` <span class="tag">privacy signal</span>` : ''}</td><td>${yesNo(r.preferences)} / ${yesNo(r.analytics)} / ${yesNo(r.marketing)}</td><td>${MODE_LABEL[r.mode] ?? r.mode}</td><td>${placeName(r.country, r.region_code)}</td><td>${r.rev}</td><td>${DEVICE_LABEL[r.device] ?? r.device}</td><td>${r.page}</td></tr>`
			)}</tbody></table>`
		: html`<p class="muted">No records.</p>`;

export async function recordsPage(ctx: Ctx) {
	const site = ctx.site;
	if (!site) return adminPage(ctx, 'Consent records', '/admin/records', noSitePrompt());
	const id = (ctx.url.searchParams.get('id') ?? '').trim();
	const lookup = id
		? CONSENT_ID_RE.test(id)
			? await recordsForConsentId(ctx.db, site.key, id)
			: null
		: undefined;
	const recent = await recentRecords(ctx.db, site.key, 50);
	return adminPage(
		ctx,
		`Consent records: ${site.name}`,
		'/admin/records',
		html`<p>One row per choice a visitor made: proof of consent. No IP addresses are kept. Records are deleted automatically after ${RETENTION_YEARS} years.</p>
<form method="get" action="/admin/records" class="card"><input type="hidden" name="site" value="${site.key}"><label for="id">Look up a consent reference</label><p class="small muted">Visitors can find it in their <code>wlc_consent</code> cookie (the 16 characters after “1.”).</p><div class="row"><input id="id" name="id" type="text" maxlength="40" value="${id}" autocomplete="off"><button type="submit">Look up</button></div></form>
${lookup === null ? html`<p class="msg err" role="alert">A reference is 16 letters, digits, - or _.</p>` : lookup ? html`<h2>Records for ${id}</h2>${table(lookup)}` : ''}
<form method="get" action="/admin/records.csv" class="card"><input type="hidden" name="site" value="${site.key}"><h2>Download as a spreadsheet (CSV)</h2><div class="row"><div><label for="from">From</label><input id="from" name="from" type="date" required value="${dayKey(ctx.now - 29 * DAY_MS)}"></div><div><label for="to">To</label><input id="to" name="to" type="date" required value="${dayKey(ctx.now)}"></div><button type="submit">Download</button></div><p class="small muted">Dates are UTC days. Up to ${CSV_MAX_ROWS.toLocaleString('en')} rows per file.</p></form>
<h2>Latest 50</h2>${table(recent)}`
	);
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function recordsCsv(ctx: Ctx): Promise<Response> {
	const site = ctx.site;
	const from = ctx.url.searchParams.get('from') ?? '';
	const to = ctx.url.searchParams.get('to') ?? '';
	const a = Date.parse(`${from}T00:00:00Z`);
	const b = Date.parse(`${to}T23:59:59.999Z`);
	const real = (d: string, ms: number) => DAY_RE.test(d) && Number.isFinite(ms) && dayKey(ms) === d;
	const back = html`<p><a href="/admin/records${site ? `?site=${site.key}` : ''}">Back to records</a></p>`;
	if (!site || !real(from, a) || !real(to, b) || !(a <= b))
		return adminPage(ctx, 'Consent records', '/admin/records', back, {
			error: 'Choose a real start date and an end date after it.'
		});
	const rows = await recordsBetween(ctx.db, site.key, a, b);
	if (rows.length > CSV_MAX_ROWS)
		return adminPage(ctx, 'Consent records', '/admin/records', back, {
			error: `That range holds more than ${CSV_MAX_ROWS.toLocaleString('en')} records. Choose a shorter range and download it in parts.`
		});
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
			'Website'
		],
		rows.map((r) => [
			new Date(r.created_at).toISOString().replace('T', ' ').slice(0, 19), r.consent_id, ACTION_LABEL[r.action] ?? 'Other',
			yesNo(r.preferences), yesNo(r.analytics), yesNo(r.marketing), MODE_LABEL[r.mode] ?? 'Other', placeName(r.country, r.region_code),
			r.rev, r.lang, DEVICE_LABEL[r.device] ?? 'Unknown', yesNo(r.gpc), r.page, browserName(r.user_agent), site.name
		]) // prettier-ignore
	);
	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="consent-records-${site.key}-${from}-to-${to}.csv"`,
			'cache-control': 'private, no-store',
			'x-content-type-options': 'nosniff'
		}
	});
}
