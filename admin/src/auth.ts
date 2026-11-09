// One owner. Signed session cookie, Origin check on every admin POST, sign-in limit per hashed IP.
import type { Db, Env } from './db.ts';

const enc = new TextEncoder();
export const SESSION_COOKIE = '__Host-wlc_admin';
export const SESSION_MS = 12 * 3_600_000;
export const LOGIN_LIMIT = 5;
export const LOGIN_WINDOW_MS = 15 * 60_000;

const b64url = (buf: ArrayBuffer) =>
	btoa(String.fromCharCode(...new Uint8Array(buf)))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');

async function hmac(secret: string, msg: string): Promise<ArrayBuffer> {
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	return crypto.subtle.sign('HMAC', key, enc.encode(msg));
}

function sameBytes(a: ArrayBuffer, b: ArrayBuffer): boolean {
	const x = new Uint8Array(a);
	const y = new Uint8Array(b);
	if (x.length !== y.length) return false;
	let diff = 0;
	for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
	return diff === 0;
}

/** What is missing before the admin can be used, or null when both secrets are set. */
export function setupProblem(env: Pick<Env, 'ADMIN_PASSWORD' | 'SESSION_SECRET'>): string | null {
	if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 12)
		return 'Set ADMIN_PASSWORD (at least 12 characters) with: npx wrangler secret put ADMIN_PASSWORD -c admin/wrangler.jsonc';
	if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32)
		return 'Set SESSION_SECRET (at least 32 random characters) with: npx wrangler secret put SESSION_SECRET -c admin/wrangler.jsonc';
	return null;
}

interface Secrets {
	ADMIN_PASSWORD: string;
	SESSION_SECRET: string;
}
// The signing key includes the password, so changing either secret signs everyone out.
const signingKey = (env: Secrets) => `${env.SESSION_SECRET}\u0000${env.ADMIN_PASSWORD}`;

/** Cookie value `<expiry ms>.<signature>`. */
export async function createSession(env: Secrets, now = Date.now()): Promise<string> {
	const exp = now + SESSION_MS;
	return `${exp}.${b64url(await hmac(signingKey(env), `admin.${exp}`))}`;
}

export async function verifySession(
	env: Secrets,
	value: string | null,
	now = Date.now()
): Promise<boolean> {
	const m = /^(\d{13})\.([A-Za-z0-9_-]{43})$/.exec(value ?? '');
	if (!m) return false;
	const exp = Number(m[1]);
	if (exp <= now || exp > now + SESSION_MS) return false;
	const want = enc.encode(b64url(await hmac(signingKey(env), `admin.${exp}`)));
	return sameBytes(want.buffer as ArrayBuffer, enc.encode(m[2]).buffer as ArrayBuffer);
}

export const sessionCookie = (value: string) =>
	`${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MS / 1000}`;
export const clearSessionCookie = () =>
	`${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function readCookieHeader(request: Request, name: string): string | null {
	for (const part of (request.headers.get('cookie') ?? '').split(';')) {
		const i = part.indexOf('=');
		if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
	}
	return null;
}

/** Constant-time password check (both sides are hashed first, so length leaks nothing). */
export async function passwordMatches(env: Secrets, given: string): Promise<boolean> {
	const [a, b] = await Promise.all([
		hmac(env.SESSION_SECRET, `pw.${given}`),
		hmac(env.SESSION_SECRET, `pw.${env.ADMIN_PASSWORD}`)
	]);
	return sameBytes(a, b);
}

/** Keyed hash of the visitor's IP for the sign-in limit; the address itself is never stored. */
// An IPv6 visitor usually controls a whole /64, so limits count the /64 as one address.
export function ipKey(ip: string): string {
	if (!ip.includes(':')) return ip;
	const [head, tail = ''] = ip.toLowerCase().split('::');
	const h = head ? head.split(':') : [];
	const t = tail ? tail.split(':') : [];
	const full = ip.includes('::') ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : h;
	return `${full.slice(0, 4).join(':')}::/64`;
}

export async function ipHash(secret: string, request: Request): Promise<string> {
	const ip = ipKey(request.headers.get('cf-connecting-ip') ?? 'unknown');
	return b64url(await hmac(secret, `ip.${ip}`)).slice(0, 32);
}

export type RateKind = 'login' | 'request';

export async function countEvents(db: Db, kind: RateKind, hash: string, since: number): Promise<number> {
	const row = await db
		.prepare('SELECT count(*) AS n FROM rate_events WHERE kind = ? AND ip_hash = ? AND at > ?')
		.bind(kind, hash, since)
		.first<{ n: number }>();
	return Number(row?.n ?? 0);
}

export async function noteEvent(db: Db, kind: RateKind, hash: string, now = Date.now()) {
	await db.prepare('INSERT INTO rate_events (kind, ip_hash, at) VALUES (?, ?, ?)').bind(kind, hash, now).run();
}

export const loginBlocked = async (db: Db, hash: string, now = Date.now()) =>
	(await countEvents(db, 'login', hash, now - LOGIN_WINDOW_MS)) >= LOGIN_LIMIT;

export const noteFailedLogin = (db: Db, hash: string, now = Date.now()) => noteEvent(db, 'login', hash, now);

export async function clearFailedLogins(db: Db, hash: string) {
	await db.prepare("DELETE FROM rate_events WHERE kind = 'login' AND ip_hash = ?").bind(hash).run();
}

/** The body as text, or null once it passes `max` bytes (read as a stream, so no length header is needed). */
export async function readCapped(request: Request, max: number): Promise<string | null> {
	if (Number(request.headers.get('content-length') ?? 0) > max) return null;
	if (!request.body) return '';
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > max) {
			await reader.cancel().catch(() => {});
			return null;
		}
		chunks.push(value);
	}
	const all = new Uint8Array(size);
	let at = 0;
	for (const c of chunks) {
		all.set(c, at);
		at += c.byteLength;
	}
	return new TextDecoder().decode(all);
}

/** URL-encoded form fields (the only kind these pages send), or null when too big or another type. */
export async function readFormFields(request: Request, max: number): Promise<Record<string, string> | null> {
	if (!(request.headers.get('content-type') ?? '').startsWith('application/x-www-form-urlencoded')) return null;
	const t = await readCapped(request, max).catch(() => null);
	if (t === null) return null;
	const out: Record<string, string> = {};
	for (const [k, v] of new URLSearchParams(t)) if (k.length <= 64) out[k] = v.slice(0, 5000);
	return out;
}

/** Admin form posts must come from the admin's own pages (blocks cross-site form posts). */
export function sameOrigin(request: Request): boolean {
	const origin = request.headers.get('origin');
	if (origin) return origin === new URL(request.url).origin;
	return request.headers.get('sec-fetch-site') === 'same-origin';
}
