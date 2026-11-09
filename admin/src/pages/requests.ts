import { html, redirect } from '../html.ts';
import { placeName, utc } from '../labels.ts';
import {
	deleteRequest,
	dueLabel,
	getRequest,
	isStatus,
	KIND_GUIDANCE,
	KIND_LABEL,
	listRequests,
	REQUEST_FILTERS,
	REQUEST_STATUSES,
	STATUS_LABEL,
	updateRequest,
	type RequestFilter,
	type RequestRow
} from '../requests.ts';
import { adminPage, noSitePrompt, type Ctx } from './layout.ts';

const FILTER_LABEL: Record<RequestFilter, string> = { open: 'Open', closed: 'Closed', all: 'All' };
const due = (r: RequestRow, now: number) => {
	if (r.status === 'done' || r.status === 'declined')
		return html`<span class="tag ok">${STATUS_LABEL[r.status]}</span>`;
	const d = dueLabel(r.due_at, now);
	return html`<span class="tag ${d.overdue ? 'fix' : ''}">${d.text}</span>`;
};

export async function requestsPage(ctx: Ctx) {
	const site = ctx.site;
	if (!site) return adminPage(ctx, 'Privacy requests', '/admin/requests', noSitePrompt());
	const filter = (REQUEST_FILTERS as readonly string[]).includes(
		ctx.url.searchParams.get('show') ?? ''
	)
		? (ctx.url.searchParams.get('show') as RequestFilter)
		: 'open';
	const rows = await listRequests(ctx.db, site.key, filter);
	const formUrl = `${ctx.url.origin}/privacy/${site.key}`;
	return adminPage(
		ctx,
		`Privacy requests: ${site.name}`,
		'/admin/requests',
		html`<p>Requests sent through the “Ask about your data” form: <a href="${formUrl}">${formUrl}</a>. Link to it from your privacy policy. No emails are sent, so check this page regularly; the overview and the daily tracking check show overdue requests.</p>
<p class="row">${REQUEST_FILTERS.map((f) => (f === filter ? html`<strong class="button">${FILTER_LABEL[f]}</strong>` : html`<a class="button secondary" href="/admin/requests?site=${site.key}&amp;show=${f}">${FILTER_LABEL[f]}</a>`))}</p>
${rows.length ? html`<table><thead><tr><th scope="col">Received (UTC)</th><th scope="col">Request</th><th scope="col">From</th><th scope="col">Status</th><th scope="col">Answer by</th></tr></thead><tbody>${rows.map((r) => html`<tr><td>${utc(r.created_at)}</td><td><a href="/admin/requests/${r.id}">${KIND_LABEL[r.kind]}</a></td><td>${r.email}</td><td>${STATUS_LABEL[r.status]}</td><td>${due(r, ctx.now)}</td></tr>`)}</tbody></table>` : html`<p class="muted">No requests here.</p>`}`
	);
}

export async function requestPage(ctx: Ctx, id: string, error = '') {
	const r = await getRequest(ctx.db, id);
	if (!r)
		return adminPage(
			ctx,
			'Request not found',
			'/admin/requests',
			html`<p><a href="/admin/requests">Back to requests</a></p>`,
			{ status: 404 }
		);
	ctx.site = ctx.sites.find((s) => s.key === r.site) ?? ctx.site;
	return adminPage(
		ctx,
		KIND_LABEL[r.kind],
		'/admin/requests',
		html`<p><a href="/admin/requests?site=${r.site}">← All requests</a></p>
<div class="card"><table><tbody>
<tr><th scope="row">From</th><td>${r.name ? html`${r.name} · ` : ''}<a href="mailto:${encodeURIComponent(r.email).replace('%40', '@')}">${r.email}</a></td></tr>
<tr><th scope="row">Received</th><td>${utc(r.created_at)} UTC · ${placeName(r.country, r.region_code)}</td></tr>
<tr><th scope="row">Answer by</th><td>${utc(r.due_at)} UTC ${due(r, ctx.now)}</td></tr>
<tr><th scope="row">Message</th><td>${r.message || html`<span class="muted">None</span>`}</td></tr>
</tbody></table></div>
<p class="msg ok"><strong>What to do:</strong> ${KIND_GUIDANCE[r.kind]} Reply to them by email. Nothing on your website changes automatically.</p>
<form method="post" action="/admin/requests/${r.id}" class="card"><label for="status">Status</label><select id="status" name="status">${REQUEST_STATUSES.map((s) => html`<option value="${s}" ${s === r.status ? html`selected` : ''}>${STATUS_LABEL[s]}</option>`)}</select>
<label for="note">Private note <span class="muted">(what you did and when)</span></label><textarea id="note" name="note" maxlength="2000">${r.note}</textarea>
<p><button type="submit" name="action" value="save">Save</button></p></form>
<form method="post" action="/admin/requests/${r.id}" class="card"><h2>Delete this request</h2><p>Removes the request and the email address from the admin for good. You may want to keep it for a while as proof you answered.</p><label class="inline"><input type="checkbox" name="confirm" value="yes" required> Yes, delete it for good</label><p><button type="submit" name="action" value="delete" class="danger">Delete</button></p></form>`,
		{ error }
	);
}

export async function saveRequest(ctx: Ctx, id: string) {
	const f = ctx.form ?? {};
	const r = await getRequest(ctx.db, id);
	if (!r) return requestPage(ctx, id);
	if (f.action === 'delete') {
		if (f.confirm !== 'yes') return requestPage(ctx, id, 'Tick the box to confirm.');
		await deleteRequest(ctx.db, id);
		return redirect(`/admin/requests?site=${r.site}&ok=deleted`);
	}
	if (!isStatus(f.status)) return requestPage(ctx, id, 'Choose a status.');
	await updateRequest(ctx.db, id, f.status, f.note ?? '', ctx.now);
	return redirect(`/admin/requests/${id}?ok=saved`);
}
