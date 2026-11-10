// Node glue for the self-hosted admin: turns node:http requests into the web Requests route() expects and
// supplies what Cloudflare would (client IP, optional visitor location, rate limit, script file).
import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { isIP } from 'node:net';
import type { Env } from '../db.ts';
import { route } from '../index.ts';

export const MAX_BODY = 1_048_576;
const HEADER_RE = /^[a-z0-9-]{1,64}$/;
const SKIP_HEADERS = new Set(['host', 'connection', 'keep-alive', 'transfer-encoding', 'upgrade']);

export interface NodeOptions {
	env: Env;
	/** Public origin such as https://consent.example.com; every request URL is built from it. */
	publicUrl: string;
	/** Use the rightmost X-Forwarded-For entry (set by your own reverse proxy) as the visitor's IP. */
	trustProxy?: boolean;
	/** Header carrying the visitor's 2-letter country, set by a proxy you control (e.g. cf-ipcountry). */
	countryHeader?: string;
	/** Header carrying the visitor's region/state code (e.g. cf-region-code). */
	regionHeader?: string;
	/** dist/welovecookies.min.js contents, served at /welovecookies.min.js. */
	script: Buffer;
	maxBody?: number;
}

/** The origin of a WLC_PUBLIC_URL value, or an error message. */
export function publicOrigin(value: string | undefined): { origin: string } | { error: string } {
	let u: URL;
	try {
		u = new URL(value ?? '');
	} catch {
		return {
			error: 'Set WLC_PUBLIC_URL to the address people use, like https://consent.example.com'
		};
	}
	if (u.protocol !== 'https:' && u.protocol !== 'http:')
		return { error: 'WLC_PUBLIC_URL must start with https:// (or http:// for local testing).' };
	if ((u.pathname !== '/' && u.pathname !== '') || u.search || u.hash || u.username)
		return { error: 'WLC_PUBLIC_URL must be only the origin, like https://consent.example.com' };
	return { origin: u.origin };
}

export const headerName = (v: string | undefined) => {
	const h = (v ?? '').trim().toLowerCase();
	return HEADER_RE.test(h) ? h : undefined;
};

const plainIp = (ip: string) => {
	const v = ip.trim().replace(/^\[|\]$/g, '');
	// IPv4 clients on a dual-stack socket arrive as ::ffff:1.2.3.4; ipKey would lump them into one /64.
	const v4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(v);
	return v4 ? v4[1] : v;
};

/** The visitor's address: the socket's, or the rightmost X-Forwarded-For entry when trusting a proxy. */
export function clientIp(req: IncomingMessage, trustProxy = false): string {
	if (trustProxy) {
		const xff = req.headers['x-forwarded-for'];
		const last = (Array.isArray(xff) ? xff.join(',') : (xff ?? '')).split(',').pop() ?? '';
		const ip = plainIp(last);
		if (isIP(ip)) return ip;
	}
	return plainIp(req.socket.remoteAddress ?? 'unknown');
}

/** Fixed-window limiter with the same shape as the Workers rate-limit binding (one process only). */
export function memoryLimiter(limit = 120, periodMs = 60_000, clock = Date.now) {
	const hits = new Map<string, { start: number; count: number }>();
	let swept = clock();
	return {
		async limit({ key }: { key: string }) {
			const now = clock();
			if (now - swept >= periodMs) {
				for (const [k, v] of hits) if (now - v.start >= periodMs) hits.delete(k);
				swept = now;
			}
			const hit = hits.get(key);
			if (!hit || now - hit.start >= periodMs) {
				hits.set(key, { start: now, count: 1 });
				return { success: true };
			}
			hit.count++;
			return { success: hit.count <= limit };
		}
	};
}

function readBody(req: IncomingMessage, max: number): Promise<Buffer | null> {
	return new Promise((resolve, reject) => {
		if (Number(req.headers['content-length'] ?? 0) > max) return resolve(null);
		const chunks: Buffer[] = [];
		let size = 0;
		const onData = (c: Buffer) => {
			size += c.length;
			if (size > max) {
				req.off('data', onData);
				req.pause();
				return resolve(null);
			}
			chunks.push(c);
		};
		req.on('data', onData);
		req.on('end', () => resolve(Buffer.concat(chunks)));
		req.on('error', reject);
	});
}

/** The web Request route() sees: URL from the public origin, trusted IP, location only when configured. */
export function toRequest(req: IncomingMessage, body: Buffer | null, o: NodeOptions): Request {
	const path = new URL(req.url ?? '/', 'http://x');
	const url = new URL(o.publicUrl);
	url.pathname = path.pathname;
	url.search = path.search;
	const headers = new Headers();
	for (const [k, v] of Object.entries(req.headers)) {
		if (v === undefined || k.startsWith(':') || SKIP_HEADERS.has(k)) continue;
		headers.set(k, Array.isArray(v) ? v.join(', ') : v);
	}
	// Never trust a visitor-sent value: rate limits and the request form count by this.
	headers.set('cf-connecting-ip', clientIp(req, o.trustProxy));
	const method = req.method ?? 'GET';
	const request = new Request(url, {
		method,
		headers,
		body: method === 'GET' || method === 'HEAD' || !body?.length ? undefined : new Uint8Array(body)
	});
	const pick = (h: string | undefined) => {
		const v = h ? req.headers[h] : undefined;
		return typeof v === 'string' ? v : undefined;
	};
	const country = pick(o.countryHeader);
	const regionCode = pick(o.regionHeader);
	// placeOf() validates both; without them every visitor gets the strictest rules (ADR 0002).
	if (country !== undefined || regionCode !== undefined)
		Object.defineProperty(request, 'cf', { value: { country, regionCode } });
	return request;
}

async function send(res: ServerResponse, response: Response, head: boolean) {
	res.statusCode = response.status;
	for (const [k, v] of response.headers) if (k !== 'set-cookie') res.setHeader(k, v);
	const cookies = response.headers.getSetCookie();
	if (cookies.length) res.setHeader('set-cookie', cookies);
	if (head || !response.body) return void res.end();
	res.end(Buffer.from(await response.arrayBuffer()));
}

function scriptResponse(req: IncomingMessage, script: Buffer, etag: string): Response {
	const headers = {
		'content-type': 'text/javascript; charset=utf-8',
		'cache-control': 'public, max-age=3600',
		'x-content-type-options': 'nosniff',
		etag
	};
	if (req.headers['if-none-match'] === etag) return new Response(null, { status: 304, headers });
	return new Response(new Uint8Array(script), { headers });
}

const failed = () =>
	new Response('Something went wrong.', { status: 500, headers: { 'cache-control': 'no-store' } });

export function createHandler(o: NodeOptions, handle = route) {
	const max = o.maxBody ?? MAX_BODY;
	const etag = `"${createHash('sha256').update(o.script).digest('base64url').slice(0, 27)}"`;
	return async (req: IncomingMessage, res: ServerResponse) => {
		const head = req.method === 'HEAD';
		try {
			const path = new URL(req.url ?? '/', 'http://x').pathname;
			if (path === '/welovecookies.min.js' && (head || req.method === 'GET'))
				return await send(res, scriptResponse(req, o.script, etag), head);
			const body = head || req.method === 'GET' ? null : await readBody(req, max);
			if (body === null && !head && req.method !== 'GET') {
				res.on('finish', () => req.destroy());
				return await send(
					res,
					new Response('Request too large.', {
						status: 413,
						headers: { connection: 'close', 'cache-control': 'no-store' }
					}),
					false
				);
			}
			await send(res, await handle(toRequest(req, body, o), o.env), head);
		} catch (err) {
			console.error('request failed', err instanceof Error ? err.message : err);
			if (!res.headersSent) await send(res, failed(), head).catch(() => res.destroy());
			else res.destroy();
		}
	};
}

/** Milliseconds until the next 03:17 UTC, the Worker's cron time. */
export function msUntilDaily(now: number): number {
	const d = new Date(now);
	let at = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 3, 17);
	if (at <= now) at += 86_400_000;
	return at - now;
}
