import { BANNER_POSITIONS, CONSENT_CATEGORIES, type BannerPosition } from '../../../src/lib/consent/types.ts';
import { html, redirect } from '../html.ts';
import { CATEGORY_LABEL, utc } from '../labels.ts';
import {
	BANNER_LANGUAGES,
	EDITABLE_TEXTS,
	INTEGRATIONS,
	listVersions,
	MAX_COOKIES,
	parseCookie,
	safeCssValue,
	saveSettings,
	siteSettings,
	THEME_FIELDS,
	type SiteSettings,
	type TextOverrides
} from '../settings.ts';
import { adminPage, noSitePrompt, type Ctx } from './layout.ts';

const POSITION_LABEL: Record<BannerPosition, string> = {
	auto: 'Automatic (bottom left on computers, bottom centre on tablets)',
	'bottom-left': 'Bottom left',
	'bottom-right': 'Bottom right',
	'bottom-center': 'Bottom centre'
};
const checkbox = (name: string, label: string, on: boolean, hint = '') =>
	html`<label class="inline"><input type="checkbox" name="${name}" ${on ? html`checked` : ''}> ${label}</label>${hint ? html`<p class="small muted">${hint}</p>` : ''}`;
const langOf = (v: string | null | undefined) => (BANNER_LANGUAGES.some((l) => l.code === v) ? (v as string) : '*');

export async function bannerPage(ctx: Ctx, error = '') {
	const site = ctx.site;
	if (!site) return adminPage(ctx, 'Banner', '/admin/banner', noSitePrompt());
	const s = siteSettings(site);
	const lang = langOf(ctx.form?.lang ?? ctx.url.searchParams.get('lang'));
	const t = s.texts[lang] ?? {};
	const versions = await listVersions(ctx.db, site.key);
	return adminPage(
		ctx,
		`Banner: ${site.name}`,
		'/admin/banner',
		html`<p>Banner version <strong>${site.rev}</strong>. Changing the wording or the Preferences category starts a new version and asks every visitor again.</p>
<form method="post" action="/admin/banner" class="card">
<input type="hidden" name="site" value="${site.key}"><input type="hidden" name="lang" value="${lang}">
<h2>Banner</h2>
${checkbox('enabled', 'Show the banner with these settings', s.enabled, 'When off, the script still shows its basic built-in banner (guessed from the visitor’s time zone), without your wording and without keeping records. Remove the script tag to stop it completely.')}
<label for="position">Position on larger screens</label><select id="position" name="position">${BANNER_POSITIONS.map((p) => html`<option value="${p}" ${s.position === p ? html`selected` : ''}>${POSITION_LABEL[p]}</option>`)}</select>
<p class="small muted">Phones always get a bar at the bottom.</p>
${checkbox('floatingButton', 'Show a small cookie button after a choice, so visitors can change their mind', s.floatingButton)}
${checkbox('preferencesCategory', 'Offer the Preferences category (only if this website has preference cookies)', s.preferencesCategory)}
${checkbox('noticeOptOut', 'Show a short notice where people can opt out (most US privacy states, Canada)', s.noticeBanner.optOut)}
${checkbox('noticeNotice', 'Show a short notice in places without a cookie law', s.noticeBanner.notice)}
<h2>Wording</h2>
<p class="small muted">Leave a field empty to keep the built-in text, which is translated into 20 languages. Showing: <strong>${BANNER_LANGUAGES.find((l) => l.code === lang)?.name}</strong>. <a href="/admin/banner?site=${site.key}&amp;lang=*">Every language</a> · <a href="/admin/banner?site=${site.key}&amp;lang=en">English</a> · <a href="#lang-pick">other languages</a></p>
${EDITABLE_TEXTS.map((f) => html`<label for="text_${f.key}">${f.label}</label>${f.long ? html`<textarea id="text_${f.key}" name="text_${f.key}" maxlength="${f.max}">${ctx.form?.[`text_${f.key}`] ?? t[f.key] ?? ''}</textarea>` : html`<input id="text_${f.key}" name="text_${f.key}" type="text" maxlength="${f.max}" value="${ctx.form?.[`text_${f.key}`] ?? t[f.key] ?? ''}">`}`)}
<h2>Look</h2>
<p class="small muted">Any CSS color or size, like <code>#1d4ed8</code> or <code>8px</code>. Empty uses your website’s own styles.</p>
<div class="grid">${THEME_FIELDS.map((f) => html`<div><label for="theme_${f.key}">${f.label}</label><input id="theme_${f.key}" name="theme_${f.key}" type="text" maxlength="120" value="${ctx.form?.[`theme_${f.key}`] ?? s.theme[f.key] ?? ''}"></div>`)}</div>
<h2>Tools this website uses</h2>
<p class="small muted">The banner tells each tool what the visitor allowed. Switch on only the ones on this website, and list their cookies on the Cookies page.</p>
${INTEGRATIONS.map((i) => checkbox(`int_${i.key}`, i.label, s.integrations[i.key]))}
<p><button type="submit" name="action" value="save">Save</button></p>
</form>
<form method="get" action="/admin/banner" class="card" id="lang-pick"><input type="hidden" name="site" value="${site.key}"><label for="lang">Edit wording for</label><div class="row"><select id="lang" name="lang">${BANNER_LANGUAGES.map((l) => html`<option value="${l.code}" ${l.code === lang ? html`selected` : ''}>${l.name}</option>`)}</select><button type="submit" class="secondary">Show</button></div></form>
<form method="post" action="/admin/banner" class="card"><input type="hidden" name="site" value="${site.key}"><h2>Ask everyone again</h2><p>Starts a new banner version without changing anything, so every visitor sees the banner again on their next visit.</p><button type="submit" name="action" value="ask_again" class="secondary">Ask everyone again</button></form>
<h2>Versions shown</h2><p class="small muted">What each version said and which cookies it listed is kept as proof.</p>
<table><thead><tr><th scope="col">Version</th><th scope="col">Started (UTC)</th><th scope="col">Cookies listed</th><th scope="col">Wording changed</th></tr></thead><tbody>${versions.map((v) => {
			let cookies = 0;
			let langs = '';
			try {
				cookies = (JSON.parse(v.cookies_json) as unknown[]).length;
				langs = Object.keys((JSON.parse(v.texts_json) as { texts: object }).texts ?? {}).map((c) => BANNER_LANGUAGES.find((l) => l.code === c)?.name ?? c).join(', ');
			} catch {
				/* show what we can */
			}
			return html`<tr><td>${v.rev}</td><td>${utc(v.created_at)}</td><td>${cookies}</td><td>${langs || 'Built-in text'}</td></tr>`;
		})}</tbody></table>`,
		{ error }
	);
}

export async function saveBanner(ctx: Ctx) {
	const site = ctx.site;
	const f = ctx.form ?? {};
	if (!site) return bannerPage(ctx);
	const s = siteSettings(site);
	const lang = langOf(f.lang);
	if (f.action === 'ask_again') {
		await saveSettings(ctx.db, site, s, { askAgain: true, now: ctx.now });
		return redirect(`/admin/banner?site=${site.key}&lang=${encodeURIComponent(lang)}&ok=asked`);
	}
	const texts: TextOverrides = {};
	for (const { key, max, label } of EDITABLE_TEXTS) {
		const v = (f[`text_${key}`] ?? '').trim();
		if (v.length > max) return bannerPage(ctx, `${label}: use at most ${max} characters.`);
		if (v) texts[key] = v;
	}
	const theme: SiteSettings['theme'] = {};
	for (const { key, label } of THEME_FIELDS) {
		const v = (f[`theme_${key}`] ?? '').trim();
		if (!v) continue;
		if (!safeCssValue(v)) return bannerPage(ctx, `${label}: use a plain color or size, like #1d4ed8 or 8px (no images or outside addresses).`);
		theme[key] = v;
	}
	const allTexts = { ...s.texts };
	if (Object.keys(texts).length) allTexts[lang] = texts;
	else delete allTexts[lang];
	const next: SiteSettings = {
		...s,
		enabled: f.enabled === 'on',
		position: (BANNER_POSITIONS as readonly string[]).includes(f.position) ? (f.position as BannerPosition) : s.position,
		floatingButton: f.floatingButton === 'on',
		preferencesCategory: f.preferencesCategory === 'on',
		noticeBanner: { optOut: f.noticeOptOut === 'on', notice: f.noticeNotice === 'on' },
		theme,
		texts: allTexts,
		integrations: Object.fromEntries(INTEGRATIONS.map((i) => [i.key, f[`int_${i.key}`] === 'on'])) as unknown as SiteSettings['integrations']
	};
	const { bumped } = await saveSettings(ctx.db, site, next, { now: ctx.now });
	return redirect(`/admin/banner?site=${site.key}&lang=${encodeURIComponent(lang)}&ok=${bumped ? 'asked' : 'saved'}`);
}

const categorySelect = (id: string, value: string) =>
	html`<select id="${id}" name="category">${CONSENT_CATEGORIES.map((c) => html`<option value="${c}" ${c === value ? html`selected` : ''}>${CATEGORY_LABEL[c]}</option>`)}</select>`;

const cookieFields = (prefix: string, c: Partial<Record<string, string>>) => html`<div class="grid">
<div><label for="${prefix}name">Cookie name</label><input id="${prefix}name" name="name" type="text" required maxlength="80" value="${c.name ?? ''}"></div>
<div><label for="${prefix}label">Plain name visitors read <span class="muted">(optional)</span></label><input id="${prefix}label" name="label" type="text" maxlength="80" value="${c.label ?? ''}"></div>
<div><label for="${prefix}provider">Set by</label><input id="${prefix}provider" name="provider" type="text" required maxlength="80" value="${c.provider ?? ''}"></div>
<div><label for="${prefix}category">Category</label>${categorySelect(`${prefix}category`, c.category ?? 'analytics')}</div>
<div><label for="${prefix}duration">How long it lasts</label><input id="${prefix}duration" name="duration" type="text" required maxlength="40" value="${c.duration ?? ''}"></div>
</div><label for="${prefix}purpose">What it is for (one sentence)</label><input id="${prefix}purpose" name="purpose" type="text" required maxlength="300" value="${c.purpose ?? ''}">`;

export function cookiesPage(ctx: Ctx, error = '') {
	const site = ctx.site;
	if (!site) return adminPage(ctx, 'Cookies', '/admin/cookies', noSitePrompt());
	const s = siteSettings(site);
	const adding = ctx.form?.action === 'add' ? ctx.form : {};
	return adminPage(
		ctx,
		`Cookies: ${site.name}`,
		'/admin/cookies',
		html`<p>The cookie list visitors see in the banner. List every cookie this website and its tools set. Changing the list (anything but the plain name) asks every visitor again.</p>
${s.cookies.map(
			(c, i) => html`<form method="post" action="/admin/cookies" class="card"><input type="hidden" name="site" value="${site.key}"><input type="hidden" name="index" value="${i}"><input type="hidden" name="count" value="${s.cookies.length}">
${cookieFields(`c${i}_`, { ...c })}
<p class="row"><button type="submit" name="action" value="save">Save</button><button type="submit" name="action" value="remove" class="secondary">Remove</button></p></form>`
		)}
${s.cookies.length < MAX_COOKIES ? html`<form method="post" action="/admin/cookies" class="card"><input type="hidden" name="site" value="${site.key}"><input type="hidden" name="count" value="${s.cookies.length}"><h2>Add a cookie</h2>${cookieFields('new_', adding)}<p><button type="submit" name="action" value="add">Add</button></p></form>` : ''}`,
		{ error }
	);
}

export async function saveCookies(ctx: Ctx) {
	const site = ctx.site;
	const f = ctx.form ?? {};
	if (!site) return cookiesPage(ctx);
	const s = siteSettings(site);
	if (Number(f.count) !== s.cookies.length) return cookiesPage(ctx, 'The list changed in another tab. Check it below and try again.');
	const cookies = [...s.cookies];
	const i = Number(f.index);
	if (f.action === 'remove' || f.action === 'save') {
		if (!Number.isInteger(i) || i < 0 || i >= cookies.length) return cookiesPage(ctx, 'That cookie is no longer in the list.');
		if (f.action === 'remove') cookies.splice(i, 1);
	}
	if (f.action === 'save' || f.action === 'add') {
		const p = parseCookie({ name: f.name, label: f.label ?? '', provider: f.provider, category: f.category, purpose: f.purpose, duration: f.duration });
		if (!p.ok) return cookiesPage(ctx, p.error);
		if (f.action === 'add') {
			if (cookies.length >= MAX_COOKIES) return cookiesPage(ctx, `The list can hold up to ${MAX_COOKIES} cookies.`);
			cookies.push(p.cookie);
		} else cookies[i] = p.cookie;
	}
	const { bumped } = await saveSettings(ctx.db, site, { ...s, cookies }, { now: ctx.now });
	return redirect(`/admin/cookies?site=${site.key}&ok=${bumped ? 'asked' : 'saved'}`);
}
