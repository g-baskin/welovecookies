import { getSite, listSiteRows } from '../db.ts';
import { html, redirect } from '../html.ts';
import { utc } from '../labels.ts';
import {
	createSite,
	listSitesWithCounts,
	parsePrivacyUrl,
	parseSiteForm,
	snippet,
	updateSite
} from '../sites.ts';
import { allLatestChecks, runCheck, runChecks, trackingSummary } from '../tracking.ts';
import { text } from '../settings.ts';
import { adminPage, type Ctx } from './layout.ts';

export async function sitesPage(ctx: Ctx, error = '') {
	const sites = await listSitesWithCounts(ctx.db, ctx.now);
	const f = ctx.form?.action === 'add' ? ctx.form : {};
	return adminPage(
		ctx,
		'Websites',
		'/admin/sites',
		html`<p>Each website gets its own key, banner settings, cookie list and records. To connect one, replace its plain We Love Cookies script tag with the one shown here.</p>
${sites.map(
	(
		s
	) => html`<div class="card"><h2>${s.name} ${s.enabled ? html`<span class="tag ok">On</span>` : html`<span class="tag">Off</span>`}</h2>
<p class="small">${s.origin} · key <code>${s.key}</code> · ${s.records30} ${s.records30 === 1 ? 'choice' : 'choices'} in the last 30 days</p>
<label for="snip_${s.key}">Script tag for the &lt;head&gt; of every page</label><textarea id="snip_${s.key}" class="code" readonly>${snippet(ctx.url.origin, s.key)}</textarea>
<p class="small">“Ask about your data” form: <a href="${ctx.url.origin}/privacy/${s.key}">${ctx.url.origin}/privacy/${s.key}</a></p>
<form method="post" action="/admin/sites"><input type="hidden" name="key" value="${s.key}"><input type="hidden" name="site" value="${s.key}">
<div class="grid"><div><label for="name_${s.key}">Name</label><input id="name_${s.key}" name="name" type="text" required maxlength="80" value="${s.name}"></div>
<div><label for="privacy_${s.key}">Privacy policy link</label><input id="privacy_${s.key}" name="privacy" type="url" maxlength="500" placeholder="https://" value="${s.privacy_url}"></div></div>
<label class="inline"><input type="checkbox" name="enabled" ${s.enabled ? html`checked` : ''}> Connected (when off, its banner falls back to the basic built-in one and nothing is recorded)</label>
<p><button type="submit" name="action" value="update" class="secondary">Save</button></p></form></div>`
)}
<form method="post" action="/admin/sites" class="card"><h2>Add a website</h2>
<label for="new_name">Name</label><input id="new_name" name="name" type="text" required maxlength="80" value="${f.name ?? ''}">
<label for="new_address">Address</label><input id="new_address" name="address" type="text" required maxlength="200" placeholder="example.com" value="${f.address ?? ''}">
<p class="small muted">Just the address, like example.com or https://www.example.com. It is saved as https://. www and other subdomains count as different addresses; add each one people visit. http://localhost works for testing.</p>
<label for="new_privacy">Privacy policy link <span class="muted">(recommended)</span></label><input id="new_privacy" name="privacy" type="url" maxlength="500" placeholder="https://example.com/privacy" value="${f.privacy ?? ''}">
<p><button type="submit" name="action" value="add">Add website</button></p></form>`,
		{ error }
	);
}

export async function saveSite(ctx: Ctx) {
	const f = ctx.form ?? {};
	if (f.action === 'add') {
		const p = parseSiteForm(f);
		if (!p.ok) return sitesPage(ctx, p.error);
		const r = await createSite(ctx.db, p.value, ctx.now);
		if (!r.ok) return sitesPage(ctx, r.error);
		return redirect(`/admin/sites?site=${r.key}&ok=added`);
	}
	const site = await getSite(ctx.db, f.key);
	if (!site) return sitesPage(ctx, 'That website no longer exists.');
	const name = text(f.name, 80, 1);
	if (!name) return sitesPage(ctx, 'Give the website a name (up to 80 characters).');
	const privacyUrl = parsePrivacyUrl(f.privacy);
	if (privacyUrl === null)
		return sitesPage(
			ctx,
			'The privacy policy link must be a full web address starting with https://'
		);
	await updateSite(ctx.db, site.key, { name, privacyUrl, enabled: f.enabled === 'on' }, ctx.now);
	return redirect(`/admin/sites?site=${site.key}&ok=saved`);
}

export async function trackingPage(ctx: Ctx) {
	const checks = await allLatestChecks(ctx.db);
	const rows = ctx.sites.map((s) => ({ s, check: checks.get(s.key) ?? null }));
	const cur = rows.find((r) => r.s.key === ctx.site?.key);
	return adminPage(
		ctx,
		'Tracking & compliance check',
		'/admin/tracking',
		html`<p>Runs every day and when you press “Check now”. It looks for common gaps: a missing privacy policy link, tools without listed cookies, overdue privacy requests, a banner that stopped showing, and legal lists that are due a re-check. It is a reminder list, not legal advice.</p>
${
	cur
		? html`<div class="card"><h2>${cur.s.name}</h2>${cur.check ? html`<p>${trackingSummary(cur.check.issues)} <span class="muted small">Last run ${utc(cur.check.at)} UTC.</span></p>${cur.check.issues.length ? html`<ul>${cur.check.issues.map((i) => html`<li><span class="tag ${i.level}">${i.level === 'fix' ? 'Fix' : 'Check'}</span> ${i.text}${i.href?.startsWith('/admin/') ? html` <a href="${i.href}">Go there</a>` : ''}</li>`)}</ul>` : ''}` : html`<p>Not run yet.</p>`}
<form method="post" action="/admin/tracking"><input type="hidden" name="site" value="${cur.s.key}"><button type="submit">Check now</button></form></div>`
		: html`<div class="card"><p>No website is connected yet. <a href="/admin/sites">Add one</a>.</p></div>`
}
${rows.length > 1 ? html`<h2>All websites</h2><table><thead><tr><th scope="col">Website</th><th scope="col">Result</th><th scope="col">Last run (UTC)</th></tr></thead><tbody>${rows.map((r) => html`<tr><td><a href="/admin/tracking?site=${r.s.key}">${r.s.name}</a>${r.s.enabled ? '' : ' (off)'}</td><td>${r.check ? trackingSummary(r.check.issues) : 'Not run yet.'}</td><td>${r.check ? utc(r.check.at) : ''}</td></tr>`)}</tbody></table>` : ''}`
	);
}

export async function checkNow(ctx: Ctx) {
	if (!ctx.site) return trackingPage(ctx);
	await runCheck(ctx.db, ctx.site, ctx.now);
	return redirect(`/admin/tracking?site=${ctx.site.key}&ok=checked`);
}

/** Daily: the check for every connected website (a fixed number of queries, however many sites). */
export async function checkAllSites(db: Ctx['db'], now = Date.now()) {
	const sites = (await listSiteRows(db)).filter((s) => s.enabled);
	return (await runChecks(db, sites, now)).size;
}
