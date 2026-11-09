// Shared admin page frame: navigation, website switcher, sign-out, flash messages.
import type { Db, Env, SiteRow } from '../db.ts';
import { html, htmlResponse, type Html } from '../html.ts';

export interface Ctx {
	request: Request;
	env: Env & { ADMIN_PASSWORD: string; SESSION_SECRET: string };
	db: Db;
	url: URL;
	now: number;
	sites: SiteRow[];
	/** The website being looked at (?site=, else the first one), or null when none exist yet. */
	site: SiteRow | null;
	/** Open privacy requests for the current website (nav badge). */
	openRequests: number;
	form?: Record<string, string>;
}

const NAV = [
	{ path: '/admin', label: 'Overview' },
	{ path: '/admin/records', label: 'Records' },
	{ path: '/admin/banner', label: 'Banner' },
	{ path: '/admin/cookies', label: 'Cookies' },
	{ path: '/admin/requests', label: 'Requests' },
	{ path: '/admin/tracking', label: 'Tracking check' },
	{ path: '/admin/sites', label: 'Websites' }
] as const;

/** Fixed flash messages chosen by ?ok=… (never echoes arbitrary text). */
const FLASH: Record<string, string> = {
	saved: 'Saved.',
	asked: 'Saved. Every visitor will be asked again.',
	added: 'Website added. Copy its script tag below.',
	deleted: 'Deleted.',
	checked: 'Check finished.'
};

export const siteQuery = (ctx: Ctx) => (ctx.site ? `?site=${encodeURIComponent(ctx.site.key)}` : '');

export function adminPage(ctx: Ctx, title: string, active: string, body: Html, opts: { error?: string; status?: number } = {}) {
	const ok = FLASH[ctx.url.searchParams.get('ok') ?? ''];
	const q = siteQuery(ctx);
	const switcher = ctx.sites.length
		? html`<form method="get" action="${ctx.url.pathname.startsWith('/admin/requests/') ? '/admin/requests' : ctx.url.pathname}" class="row switch"><label for="site-switch" class="inline small">Website</label><select id="site-switch" name="site">${ctx.sites.map((s) => html`<option value="${s.key}" ${s.key === ctx.site?.key ? html`selected` : ''}>${s.name}${s.enabled ? '' : ' (off)'}</option>`)}</select><button type="submit">Show</button></form>`
		: '';
	return htmlResponse(
		html`<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title} – We Love Cookies admin</title><link rel="stylesheet" href="/wlc.css"></head><body>
<header class="top"><div class="in"><span class="brand">We Love Cookies</span>
<nav aria-label="Admin">${NAV.map((n) => html`<a href="${n.path}${q}" ${active === n.path ? html`aria-current="page"` : ''}>${n.label}${n.path === '/admin/requests' && ctx.openRequests ? ` (${ctx.openRequests})` : ''}</a> `)}</nav>
<form method="post" action="/admin/logout"><button type="submit">Sign out</button></form></div></header>
${switcher ? html`<div class="sitebar"><div class="in">${switcher}</div></div>` : ''}
<main><h1>${title}</h1>${ok ? html`<p class="msg ok" role="status">${ok}</p>` : ''}${opts.error ? html`<p class="msg err" role="alert">${opts.error}</p>` : ''}${body}</main></body></html>`,
		opts.status ?? (opts.error ? 400 : 200)
	);
}

export const noSitePrompt = () =>
	html`<div class="card"><p>No website is connected yet.</p><p><a class="button" href="/admin/sites">Add your first website</a></p></div>`;
