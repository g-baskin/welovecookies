import { html } from '../html.ts';
import { DEVICE_LABEL, pct, utc } from '../labels.ts';
import { overview, type Tally } from '../log.ts';
import { requestCounts } from '../requests.ts';
import { latestCheck, trackingSummary } from '../tracking.ts';
import { adminPage, noSitePrompt, type Ctx } from './layout.ts';

const PERIODS = [7, 30, 90] as const;

const row = (label: string, t: Tally) =>
	html`<tr><th scope="row">${label}</th><td>${t.seen}</td><td>${t.answered}</td><td>${pct(t.acceptAll, t.answered)}</td><td>${pct(t.rejectAll, t.answered)}</td><td>${pct(t.custom, t.answered)}</td><td>${pct(t.acknowledge, t.answered)}</td></tr>`;
const head = (first: string) =>
	html`<thead><tr><th scope="col">${first}</th><th scope="col">Banner shown</th><th scope="col">Answered</th><th scope="col">Accepted all</th><th scope="col">Rejected all</th><th scope="col">Chose some</th><th scope="col">Said OK</th></tr></thead>`;

export async function overviewPage(ctx: Ctx) {
	const site = ctx.site;
	if (!site) return adminPage(ctx, 'Overview', '/admin', noSitePrompt());
	const days = PERIODS.find((p) => String(p) === ctx.url.searchParams.get('days')) ?? 30;
	const [o, req, check] = await Promise.all([
		overview(ctx.db, site.key, days, ctx.now),
		requestCounts(ctx.db, site.key, ctx.now),
		latestCheck(ctx.db, site.key)
	]);
	const t = o.total;
	const stat = (label: string, value: string | number, note = '') =>
		html`<div class="card stat"><b>${value}</b><span>${label}${note ? html`<br>${note}` : ''}</span></div>`;
	return adminPage(
		ctx,
		`Overview: ${site.name}`,
		'/admin',
		html`<form method="get" action="/admin" class="row"><input type="hidden" name="site" value="${site.key}"><label for="days" class="inline">Period</label><select id="days" name="days">${PERIODS.map((p) => html`<option value="${p}" ${p === days ? html`selected` : ''}>Last ${p} days</option>`)}</select><button type="submit" class="secondary">Show</button></form>
<div class="grid">
${stat('Banner shown', t.seen)}
${stat('Answered', t.answered, `${pct(t.answered, t.seen)} of views`)}
${stat('Accepted all', pct(t.acceptAll, t.answered), `${t.acceptAll} people`)}
${stat('Rejected all', pct(t.rejectAll, t.answered), `${t.rejectAll} people`)}
${stat('Chose some', pct(t.custom, t.answered), `${t.custom} people`)}
${stat('Browser privacy signal', t.gpc, 'marketing turned off automatically')}
</div>
<p class="small muted">Counted without cookies. “Answered” includes “OK” on opt-out notices. Withdrawals: ${t.withdraw}.</p>
<h2>By region rules</h2><table>${head('Rules')}<tbody>${o.byRegion.map((g) => row(g.label, g.tally))}</tbody></table>
<p class="small muted">${o.byRegion.map((g) => html`<strong>${g.label}:</strong> ${g.hint} `)}</p>
<h2>By device</h2><table>${head('Device')}<tbody>${Object.entries(o.byDevice).map(([d, x]) => row(DEVICE_LABEL[d] ?? d, x))}</tbody></table>
<div class="grid">
<div class="card"><h2>Privacy requests</h2><p>${req.open} open${req.overdue ? html`, <strong>${req.overdue} overdue</strong>` : ''}.</p><p><a href="/admin/requests?site=${site.key}">Open requests</a></p></div>
<div class="card"><h2>Tracking check</h2><p>${check ? html`${trackingSummary(check.issues)} <span class="muted small">(${utc(check.at)} UTC)</span>` : 'Not run yet.'}</p><p><a href="/admin/tracking?site=${site.key}">See the check</a></p></div>
</div>`
	);
}
