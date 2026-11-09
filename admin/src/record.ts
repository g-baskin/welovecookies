// POST /api/consent (a choice) and POST /api/consent/seen (a banner view) from connected websites.
// The server decides the region mode and revision (never the browser); Global Privacy Control,
// from the payload or the Sec-GPC header, turns marketing off. No IP address is stored.
import { CONSENT_ID_RE, isConsentAction, newConsentId } from '../../src/lib/consent/cookie.ts';
import { modeFor } from '../../src/lib/consent/regions.ts';
import {
	DEVICES,
	type ConsentAction,
	type ConsentMode,
	type ConsentRecordResponse,
	type Device,
	type Grants,
	type StoredConsent
} from '../../src/lib/consent/types.ts';
import { readCapped } from './auth.ts';
import { browserGpc, placeOf, type Place } from './config.ts';
import { corsHeaders, siteForRequest } from './cors.ts';
import { dayKey, type Db, type Env } from './db.ts';
import { json } from './html.ts';

export const MAX_BODY = 8192;
export const METRICS = ['seen', 'accept_all', 'reject_all', 'custom', 'acknowledge', 'withdraw', 'gpc'] as const;
export type Metric = (typeof METRICS)[number];
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview/i;

/** JSON body up to MAX_BODY bytes, else null. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
	const t = await readCapped(request, MAX_BODY).catch(() => null);
	if (!t) return null;
	try {
		const v: unknown = JSON.parse(t);
		return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

const isDevice = (v: unknown): v is Device => (DEVICES as readonly unknown[]).includes(v);
const LANG_RE = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})?$/;

export interface ChoiceInput {
	id: unknown;
	action: ConsentAction;
	grants: Grants;
	lang: string;
	device: Device;
	gpc: boolean;
	page: string;
	/** The banner version the visitor saw, when the browser sent a valid one. */
	rev: number | null;
}

export function parseChoice(b: Record<string, unknown>): ChoiceInput | null {
	const g = b.grants as Record<string, unknown> | null;
	if (!isConsentAction(b.action) || !g || typeof g !== 'object') return null;
	if (typeof g.preferences !== 'boolean' || typeof g.analytics !== 'boolean' || typeof g.marketing !== 'boolean') return null;
	if (typeof b.lang !== 'string' || !LANG_RE.test(b.lang) || !isDevice(b.device)) return null;
	if (typeof b.page !== 'string' || b.page.length > 500 || (b.gpc !== undefined && typeof b.gpc !== 'boolean')) return null;
	return {
		id: b.id,
		action: b.action,
		grants: { preferences: g.preferences, analytics: g.analytics, marketing: g.marketing },
		lang: b.lang.toLowerCase().slice(0, 12),
		device: b.device,
		gpc: b.gpc === true,
		page: b.page,
		rev: Number.isInteger(b.rev) && (b.rev as number) >= 1 ? (b.rev as number) : null
	};
}

/** Path only, and only for a page on the site's own origin. */
export function pathOnly(page: string, origin: string): string {
	try {
		const u = new URL(page, origin);
		return u.origin === origin ? u.pathname.slice(0, 200) : '';
	} catch {
		return '';
	}
}

/** The choice as the server saves it: server mode and revision, GPC forces marketing off. */
export function correctChoice(
	input: ChoiceInput,
	ctx: { mode: ConsentMode; rev: number; gpc: boolean; now: number }
): StoredConsent {
	return {
		id: typeof input.id === 'string' && CONSENT_ID_RE.test(input.id) ? input.id : newConsentId(),
		at: ctx.now,
		mode: ctx.mode,
		rev: ctx.rev,
		grants: ctx.gpc ? { ...input.grants, marketing: false } : { ...input.grants },
		action: input.action
	};
}

export const bumpStmt = (db: Db, site: string, metric: Metric, mode: ConsentMode, country: string | null, device: Device, now: number) =>
	db
		.prepare(
			'INSERT INTO consent_daily (day, site, metric, mode, country, device, count) VALUES (?, ?, ?, ?, ?, ?, 1) ON CONFLICT (day, site, metric, mode, country, device) DO UPDATE SET count = count + 1'
		)
		.bind(dayKey(now), site, metric, mode, country ?? '', device);

export async function saveChoice(
	db: Db,
	site: { key: string; rev: number; origin: string },
	input: ChoiceInput,
	ctx: { place: Place; headerGpc: boolean; userAgent: string; now: number }
): Promise<StoredConsent> {
	const gpc = input.gpc || ctx.headerGpc;
	const mode = modeFor(ctx.place.country, ctx.place.regionCode);
	// Keep the version the visitor answered (never a future one): an older one makes the banner ask again.
	const rev = input.rev !== null && input.rev <= site.rev ? input.rev : site.rev;
	const c = correctChoice(input, { mode, rev, gpc, now: ctx.now });
	const insert = db
		.prepare(
			'INSERT INTO consent_records (site, consent_id, created_at, action, preferences, analytics, marketing, mode, country, region_code, rev, lang, device, gpc, page, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
		)
		.bind(
			site.key, c.id, c.at, c.action, +c.grants.preferences, +c.grants.analytics, +c.grants.marketing,
			c.mode, ctx.place.country, ctx.place.regionCode, c.rev, input.lang, input.device, +gpc,
			pathOnly(input.page, site.origin), ctx.userAgent.slice(0, 200)
		); // prettier-ignore
	const stmts = [insert];
	if (!BOT_RE.test(ctx.userAgent)) {
		stmts.push(bumpStmt(db, site.key, c.action, mode, ctx.place.country, input.device, ctx.now));
		if (gpc && c.action !== 'gpc') stmts.push(bumpStmt(db, site.key, 'gpc', mode, ctx.place.country, input.device, ctx.now));
	}
	await db.batch(stmts);
	return c;
}

export async function handleRecord(request: Request, env: Env, now = Date.now()): Promise<Response> {
	const body = await readJson(request);
	const found = await siteForRequest(env.DB, body?.site, request.headers.get('origin'));
	if (!found.ok) return json({ error: 'Not allowed.' }, found.status === 404 ? 404 : 403);
	const headers = corsHeaders(found.site.origin);
	const input = body && parseChoice(body);
	if (!input) return json({ error: 'Invalid choice.' }, 400, headers);
	try {
		const consent = await saveChoice(env.DB, found.site, input, {
			place: placeOf(request),
			headerGpc: browserGpc(request),
			userAgent: request.headers.get('user-agent') ?? '',
			now
		});
		return json({ ok: true, consent } satisfies ConsentRecordResponse, 200, headers);
	} catch (err) {
		console.error('consent: could not record the choice', err instanceof Error ? err.message : err);
		return json({ error: 'Could not save.' }, 500, headers);
	}
}

export async function handleSeen(request: Request, env: Env, now = Date.now()): Promise<Response> {
	const body = await readJson(request);
	const found = await siteForRequest(env.DB, body?.site, request.headers.get('origin'));
	if (!found.ok) return new Response(null, { status: found.status === 404 ? 404 : 403 });
	const headers = corsHeaders(found.site.origin);
	if (!body || !isDevice(body.device)) return new Response(null, { status: 400, headers });
	const ua = request.headers.get('user-agent') ?? '';
	if (!BOT_RE.test(ua)) {
		const place = placeOf(request);
		try {
			await bumpStmt(env.DB, found.site.key, 'seen', modeFor(place.country, place.regionCode), place.country, body.device, now).run();
		} catch (err) {
			console.error('consent: could not count a banner view', err instanceof Error ? err.message : err);
		}
	}
	return new Response(null, { status: 204, headers });
}
