import {
	clearFailedLogins,
	clearSessionCookie,
	createSession,
	ipHash,
	loginBlocked,
	noteFailedLogin,
	passwordMatches,
	readFormFields,
	sameOrigin,
	sessionCookie
} from '../auth.ts';
import type { Db } from '../db.ts';
import { html, htmlResponse, plainPage, redirect } from '../html.ts';

type Secrets = { ADMIN_PASSWORD: string; SESSION_SECRET: string };

const page = (error = '', status = 200) =>
	htmlResponse(
		plainPage(
			'Sign in – We Love Cookies admin',
			html`<h1>We Love Cookies admin</h1>${error ? html`<p class="msg err" role="alert">${error}</p>` : ''}
<form method="post" action="/admin/login" class="card"><label for="password">Password</label><input id="password" name="password" type="password" required autocomplete="current-password" autofocus><p><button type="submit">Sign in</button></p></form>`
		),
		status
	);

export const loginPage = () => page();

export async function handleLogin(
	request: Request,
	env: Secrets,
	db: Db,
	now = Date.now()
): Promise<Response> {
	if (!sameOrigin(request)) return page('Please sign in from this page.', 403);
	const hash = await ipHash(env.SESSION_SECRET, request);
	if (await loginBlocked(db, hash, now))
		return page('Too many wrong passwords. Wait 15 minutes, then try again.', 429);
	// Count the attempt before checking, so parallel guesses can't slip past the limit.
	await noteFailedLogin(db, hash, now);
	const f = await readFormFields(request, 4096);
	if (!f) return page('Please sign in from this page.', 413);
	const given = (f.password ?? '').slice(0, 500);
	if (!(await passwordMatches(env, given))) return page('That password is not right.', 401);
	await clearFailedLogins(db, hash);
	return redirect('/admin', { 'set-cookie': sessionCookie(await createSession(env, now)) });
}

export const handleLogout = () => redirect('/admin/login', { 'set-cookie': clearSessionCookie() });

export const setupPage = (problem: string) =>
	htmlResponse(
		plainPage(
			'Finish setting up',
			html`<h1>Finish setting up the admin</h1><p class="msg err" role="alert">${problem}</p><p>Then reload this page. See docs/ADMIN.md.</p>`
		),
		503
	);
