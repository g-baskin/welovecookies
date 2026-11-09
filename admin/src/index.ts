// We Love Cookies optional admin Worker: banner endpoints for connected websites, the hosted privacy
// request form, the owner's admin pages and the daily job. Setup: docs/ADMIN.md
import type { D1Database, ExecutionContext, ScheduledController } from '@cloudflare/workers-types';
import { ipHash, readCookieHeader, readFormFields, sameOrigin, SESSION_COOKIE, setupProblem, verifySession } from './auth.ts';
import { handleConfig, handlePreflight } from './config.ts';
import { listSiteRows, type Db, type Env } from './db.ts';
import { CSS, htmlResponse, html, plainPage, redirect } from './html.ts';
import { purgeOld } from './log.ts';
import { bannerPage, cookiesPage, saveBanner, saveCookies } from './pages/banner.ts';
import type { Ctx } from './pages/layout.ts';
import { handleLogin, handleLogout, loginPage, setupPage } from './pages/login.ts';
import { overviewPage } from './pages/overview.ts';
import { recordsCsv, recordsPage } from './pages/records.ts';
import { requestPage, requestsPage, saveRequest } from './pages/requests.ts';
import { checkAllSites, checkNow, saveSite, sitesPage, trackingPage } from './pages/sites.ts';
import { handlePrivacy } from './privacy.ts';
import { handleRecord, handleSeen } from './record.ts';
import { requestCounts } from './requests.ts';

export interface WorkerEnv extends Omit<Env, 'DB'> {
	DB: D1Database;
}

const MAX_ADMIN_FORM = 65_536;
const notFound = () => htmlResponse(plainPage('Not found', html`<h1>Not found</h1>`), 404);
const methodNotAllowed = (allow: string) => new Response(null, { status: 405, headers: { allow } });

async function admin(request: Request, env: Env, url: URL, now: number): Promise<Response> {
	const problem = setupProblem(env);
	if (problem) return setupPage(problem);
	const secrets = env as Ctx['env'];
	const path = url.pathname.replace(/\/+$/, '') || '/admin';
	const post = request.method === 'POST';
	if (!post && request.method !== 'GET' && request.method !== 'HEAD') return methodNotAllowed('GET, POST');
	if (path === '/admin/login') return post ? handleLogin(request, secrets, env.DB, now) : loginPage();
	if (!(await verifySession(secrets, readCookieHeader(request, SESSION_COOKIE), now)))
		return post ? new Response('Sign in first.', { status: 403 }) : redirect('/admin/login');
	if (post && !sameOrigin(request)) return new Response('Cross-site form posts are not allowed.', { status: 403 });
	if (path === '/admin/logout') return post ? handleLogout() : methodNotAllowed('POST');

	const form = post ? await readFormFields(request, MAX_ADMIN_FORM) : undefined;
	if (post && !form) return new Response('Form too large or unreadable.', { status: 413 });
	const sites = await listSiteRows(env.DB);
	const wanted = form?.site ?? url.searchParams.get('site');
	const site = sites.find((s) => s.key === wanted) ?? sites.find((s) => s.enabled) ?? sites[0] ?? null;
	const ctx: Ctx = {
		request,
		env: secrets,
		db: env.DB,
		url,
		now,
		sites,
		site,
		openRequests: site ? (await requestCounts(env.DB, site.key, now)).open : 0,
		form: form ?? undefined
	};
	const req = /^\/admin\/requests\/(pr_[A-Za-z0-9_-]{16})$/.exec(path);
	if (req) return post ? saveRequest(ctx, req[1]) : requestPage(ctx, req[1]);
	switch (path) {
		case '/admin':
			return post ? methodNotAllowed('GET') : overviewPage(ctx);
		case '/admin/records':
			return post ? methodNotAllowed('GET') : recordsPage(ctx);
		case '/admin/records.csv':
			return post ? methodNotAllowed('GET') : recordsCsv(ctx);
		case '/admin/banner':
			return post ? saveBanner(ctx) : bannerPage(ctx);
		case '/admin/cookies':
			return post ? saveCookies(ctx) : cookiesPage(ctx);
		case '/admin/requests':
			return post ? methodNotAllowed('GET') : requestsPage(ctx);
		case '/admin/sites':
			return post ? saveSite(ctx) : sitesPage(ctx);
		case '/admin/tracking':
			return post ? checkNow(ctx) : trackingPage(ctx);
	}
	return notFound();
}

/** Public endpoints anyone can call: per-IP limit from the optional PUBLIC_LIMITER binding. */
async function limited(request: Request, env: Env, p: string): Promise<boolean> {
	if (!env.PUBLIC_LIMITER || request.method === 'OPTIONS') return false;
	const key = `${p.startsWith('/privacy/') ? 'privacy' : p}:${await ipHash(env.SESSION_SECRET ?? 'wlc', request)}`;
	return !(await env.PUBLIC_LIMITER.limit({ key })).success;
}

export async function route(request: Request, env: Env, now = Date.now()): Promise<Response> {
	const url = new URL(request.url);
	const p = url.pathname;
	const m = request.method;
	if ((p.startsWith('/api/consent') || (p.startsWith('/privacy/') && m === 'POST')) && (await limited(request, env, p)))
		return new Response('Too many requests. Please try again in a minute.', { status: 429, headers: { 'retry-after': '60', 'cache-control': 'no-store' } });
	if (p === '/api/consent/config') return m === 'OPTIONS' ? handlePreflight(request, env, 'GET') : m === 'GET' ? handleConfig(request, env) : methodNotAllowed('GET, OPTIONS');
	if (p === '/api/consent') return m === 'OPTIONS' ? handlePreflight(request, env, 'POST') : m === 'POST' ? handleRecord(request, env, now) : methodNotAllowed('POST, OPTIONS');
	if (p === '/api/consent/seen') return m === 'OPTIONS' ? handlePreflight(request, env, 'POST') : m === 'POST' ? handleSeen(request, env, now) : methodNotAllowed('POST, OPTIONS');
	const privacy = /^\/privacy\/(ws_[A-Za-z0-9_-]{12})$/.exec(p);
	if (privacy) return handlePrivacy(request, env, privacy[1], now);
	if (p === '/wlc.css') return new Response(CSS, { headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
	if (p === '/' || p === '') return redirect('/admin');
	if (p === '/admin' || p.startsWith('/admin/')) return admin(request, env, url, now);
	return notFound();
}

/** Daily job: retention purge first, then the tracking check for each connected website. */
export async function daily(db: Db, now = Date.now()) {
	const purged = await purgeOld(db, now);
	let checked = 0;
	try {
		checked = await checkAllSites(db, now);
	} catch (err) {
		console.error('tracking check failed', err instanceof Error ? err.message : err);
	}
	console.log('daily job', JSON.stringify({ purged, checked }));
	return { purged, checked };
}

export default {
	async fetch(request: Request, env: WorkerEnv): Promise<Response> {
		try {
			return await route(request, env as unknown as Env);
		} catch (err) {
			console.error('request failed', err instanceof Error ? err.message : err);
			return new Response('Something went wrong.', { status: 500, headers: { 'cache-control': 'no-store' } });
		}
	},
	async scheduled(_c: ScheduledController, env: WorkerEnv, ctx: ExecutionContext) {
		ctx.waitUntil(daily(env.DB as unknown as Db));
	}
};
