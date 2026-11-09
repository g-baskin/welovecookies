// GET|POST /privacy/<site key>: the hosted "Ask about your data" form a website can link to.
// Works without JavaScript. Bots that fill the hidden field get the thank-you page and nothing is kept.
import { ipHash, readFormFields } from './auth.ts';
import { placeOf } from './config.ts';
import { getSite, type Env, type SiteRow } from './db.ts';
import { html, htmlResponse, plainPage } from './html.ts';
import {
	createRequest,
	dueDaysFor,
	isKind,
	KIND_LABEL,
	parseRequestForm,
	REQUEST_KINDS
} from './requests.ts';

const MAX_FORM = 8192;

function form(
	site: SiteRow,
	action: string,
	values: Record<string, string>,
	days: number,
	error = ''
) {
	return plainPage(
		`Ask about your data – ${site.name}`,
		html`<h1>Ask about your data</h1>
<p>Send a request to <strong>${site.name}</strong> (${site.origin.replace(/^https?:\/\//, '')}) about the personal information they hold about you. They should reply by email within ${days} days, and may first ask you to confirm it's you.</p>
${error ? html`<p class="msg err" role="alert">${error}</p>` : ''}
<form method="post" action="${action}" class="card">
<fieldset><legend>What would you like them to do?</legend>
${REQUEST_KINDS.map((k) => html`<label class="inline"><input type="radio" name="kind" value="${k}" required ${values.kind === k ? html`checked` : ''}> ${KIND_LABEL[k]}</label>`)}
</fieldset>
<label for="email">Your email address</label>
<input id="email" name="email" type="email" required maxlength="254" autocomplete="email" value="${values.email ?? ''}">
<label for="name">Your name <span class="muted">(optional)</span></label>
<input id="name" name="name" type="text" maxlength="120" autocomplete="name" value="${values.name ?? ''}">
<label for="message">Anything that helps them find your details <span class="muted">(optional)</span></label>
<textarea id="message" name="message" maxlength="1000">${values.message ?? ''}</textarea>
<div class="hp" aria-hidden="true"><label for="website">Leave this empty</label><input id="website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
<p class="small muted">${site.name} uses what you enter here only to answer this request. ${site.privacy_url ? html`Read their <a href="${site.privacy_url}">privacy policy</a> to see how long they keep it.` : ''} No cookies are set on this page.</p>
<p><button type="submit">Send request</button></p>
</form>
<p class="small muted">To change your cookie choices, use the “Cookie settings” link on ${site.name}.</p>`
	);
}

function sent(site: SiteRow, email: string, days: number) {
	return plainPage(
		`Request sent – ${site.name}`,
		html`<h1>Request sent</h1><p class="msg ok" role="status">Thank you. ${site.name} has your request and should reply to <strong>${email}</strong> within ${days} days.</p><p><a href="${site.origin}">Back to ${site.name}</a></p>`
	);
}

const notFound = () =>
	htmlResponse(
		plainPage('Not found', html`<h1>Not found</h1><p>This form is not available.</p>`),
		404
	);

export async function handlePrivacy(
	request: Request,
	env: Env,
	key: string,
	now = Date.now()
): Promise<Response> {
	const site = await getSite(env.DB, key);
	if (!site || !site.enabled) return notFound();
	const url = new URL(request.url);
	const action = `/privacy/${site.key}`;
	const days = dueDaysFor(placeOf(request).country);
	if (request.method === 'GET') {
		const kind = url.searchParams.get('kind');
		return htmlResponse(form(site, action, isKind(kind) ? { kind } : {}, days));
	}
	if (request.method !== 'POST')
		return new Response(null, { status: 405, headers: { allow: 'GET, POST' } });
	if (request.headers.get('origin') !== url.origin)
		return htmlResponse(form(site, action, {}, days, 'Please send the form from this page.'), 403);
	const f = await readFormFields(request, MAX_FORM);
	if (!f) return htmlResponse(form(site, action, {}, days, 'That message is too long.'), 413);
	const values: Record<string, string> = {};
	for (const k of ['kind', 'email', 'name', 'message', 'website'])
		values[k] = (f[k] ?? '').slice(0, 2000);
	if (values.website.trim()) return htmlResponse(sent(site, values.email, days));
	const parsed = parseRequestForm(values);
	if (!parsed.ok) return htmlResponse(form(site, action, values, days, parsed.error), 400);
	const hash = env.SESSION_SECRET ? await ipHash(env.SESSION_SECRET, request) : '';
	const res = await createRequest(env.DB, site.key, parsed.value, placeOf(request), now, hash);
	if (!res.ok) return htmlResponse(form(site, action, values, days, res.error), 429);
	return htmlResponse(sent(site, parsed.value.email, res.dueDays));
}
