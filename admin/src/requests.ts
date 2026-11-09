// Privacy requests from the hosted "Ask about your data" form. Never stores an IP address and never
// changes or deletes any data on the website by itself. Engineering defaults, not legal advice.
import { newConsentId } from '../../src/lib/consent/cookie.ts';
import { countEvents } from './auth.ts';
import { DAY_MS, type Db } from './db.ts';
import { text } from './settings.ts';

export const REQUEST_KINDS = ['delete', 'copy', 'correct', 'stop_selling'] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];
export const REQUEST_STATUSES = ['new', 'in_progress', 'done', 'declined'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const OPEN_STATUSES: readonly RequestStatus[] = ['new', 'in_progress'];

export const KIND_LABEL: Record<RequestKind, string> = {
	delete: 'Delete my data',
	copy: 'Send me a copy of my data',
	correct: 'Correct my details',
	stop_selling: "Don't sell or share my information"
};
export const STATUS_LABEL: Record<RequestStatus, string> = {
	new: 'New',
	in_progress: 'Working on it',
	done: 'Done',
	declined: 'Declined'
};
export const KIND_GUIDANCE: Record<RequestKind, string> = {
	delete:
		"Check it's really them, then delete their personal details from your systems. Keep only what a law requires you to keep, and tell them what you kept and why.",
	copy: "Check it's really them, then send them a copy of the personal details you hold about them.",
	correct: "Check it's really them and what they want changed, then update their details.",
	stop_selling:
		'Stop selling or sharing their details with advertising partners. No identity check is needed for this one.'
};

export const isKind = (v: unknown): v is RequestKind =>
	(REQUEST_KINDS as readonly unknown[]).includes(v);
export const isStatus = (v: unknown): v is RequestStatus =>
	(REQUEST_STATUSES as readonly unknown[]).includes(v);

/** Days to answer, by the strictest law where the visitor is: Brazil 15, US 45, everyone else 30. */
export function dueDaysFor(country: string | null | undefined): number {
	const c = (country ?? '').toUpperCase();
	if (c === 'BR') return 15;
	if (c === 'US') return 45;
	return 30;
}

export const EMAIL_DAILY_LIMIT = 3;
export const SITE_DAILY_LIMIT = 100;
// Plain addresses only: no ? & = # / or %, so a mailto: link can't carry extra headers such as bcc.
const EMAIL_RE = /^[a-z0-9._+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
export const IP_DAILY_LIMIT = 5;

export interface RequestInput {
	kind: RequestKind;
	email: string;
	name: string;
	message: string;
}

export function parseRequestForm(
	f: Record<string, unknown>
): { ok: true; value: RequestInput } | { ok: false; error: string } {
	if (!isKind(f.kind)) return { ok: false, error: 'Choose what you would like the website to do.' };
	const email = text(f.email, 254)?.toLowerCase() ?? '';
	if (!EMAIL_RE.test(email))
		return { ok: false, error: 'Enter a valid email address, like name@example.com.' };
	const name = text(f.name ?? '', 120);
	if (name === null) return { ok: false, error: 'Please keep your name under 120 characters.' };
	const message = text(f.message ?? '', 1000);
	if (message === null)
		return { ok: false, error: 'Please keep your message under 1,000 characters.' };
	return { ok: true, value: { kind: f.kind, email, name, message } };
}

export async function createRequest(
	db: Db,
	site: string,
	input: RequestInput,
	place: { country: string | null; regionCode: string | null },
	now = Date.now(),
	ipHash = ''
): Promise<{ ok: true; id: string; dueDays: number } | { ok: false; error: string }> {
	if (ipHash && (await countEvents(db, 'request', ipHash, now - DAY_MS)) >= IP_DAILY_LIMIT)
		return {
			ok: false,
			error:
				"You've already sent several requests today. They will be answered first; please try again tomorrow."
		};
	const counts = await db
		.prepare(
			`SELECT
				(SELECT count(*) FROM privacy_requests WHERE email = ? AND created_at > ?) AS byEmail,
				(SELECT count(*) FROM privacy_requests WHERE site = ? AND created_at > ?) AS bySite`
		)
		.bind(input.email, now - DAY_MS, site, now - DAY_MS)
		.first<{ byEmail: number; bySite: number }>();
	if ((counts?.byEmail ?? 0) >= EMAIL_DAILY_LIMIT)
		return {
			ok: false,
			error:
				"You've already sent several requests today. They will be answered first; please try again tomorrow."
		};
	if ((counts?.bySite ?? 0) >= SITE_DAILY_LIMIT)
		return {
			ok: false,
			error:
				'This form is getting too many requests right now. Please try again tomorrow, or contact the website directly.'
		};
	const dueDays = dueDaysFor(place.country);
	const id = `pr_${newConsentId()}`;
	const insert = db
		.prepare(
			'INSERT INTO privacy_requests (id, site, created_at, kind, email, name, message, country, region_code, due_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
		)
		.bind(
			id,
			site,
			now,
			input.kind,
			input.email,
			input.name,
			input.message,
			place.country,
			place.regionCode,
			now + dueDays * DAY_MS
		);
	if (ipHash)
		await db.batch([
			insert,
			db
				.prepare("INSERT INTO rate_events (kind, ip_hash, at) VALUES ('request', ?, ?)")
				.bind(ipHash, now)
		]);
	else await insert.run();
	return { ok: true, id, dueDays };
}

export interface RequestRow {
	id: string;
	site: string;
	created_at: number;
	kind: RequestKind;
	status: RequestStatus;
	email: string;
	name: string;
	message: string;
	country: string | null;
	region_code: string | null;
	due_at: number;
	closed_at: number | null;
	note: string;
}

export const REQUEST_FILTERS = ['open', 'closed', 'all'] as const;
export type RequestFilter = (typeof REQUEST_FILTERS)[number];

export async function listRequests(
	db: Db,
	site: string,
	filter: RequestFilter
): Promise<RequestRow[]> {
	const where =
		filter === 'open'
			? "AND status IN ('new', 'in_progress') ORDER BY due_at"
			: filter === 'closed'
				? "AND status IN ('done', 'declined') ORDER BY created_at DESC"
				: 'ORDER BY created_at DESC';
	return (
		await db
			.prepare(`SELECT * FROM privacy_requests WHERE site = ? ${where} LIMIT 500`)
			.bind(site)
			.all<RequestRow>()
	).results;
}

export const getRequest = (db: Db, id: string) =>
	db.prepare('SELECT * FROM privacy_requests WHERE id = ?').bind(id).first<RequestRow>();

/** Closing (done or declined) stamps closed_at once; reopening clears it. */
export async function updateRequest(
	db: Db,
	id: string,
	status: RequestStatus,
	note: string,
	now = Date.now()
) {
	const closing = status === 'done' || status === 'declined';
	const n = note.slice(0, 2000);
	const r = await (
		closing
			? db
					.prepare(
						'UPDATE privacy_requests SET status = ?, note = ?, closed_at = coalesce(closed_at, ?) WHERE id = ?'
					)
					.bind(status, n, now, id)
			: db
					.prepare(
						'UPDATE privacy_requests SET status = ?, note = ?, closed_at = NULL WHERE id = ?'
					)
					.bind(status, n, id)
	).run();
	return r.meta.changes === 1;
}

/** Deletes exactly one request (the owner confirmed it on the request page). */
export async function deleteRequest(db: Db, id: string) {
	const r = await db.prepare('DELETE FROM privacy_requests WHERE id = ?').bind(id).run();
	return r.meta.changes === 1;
}

/** Overdue uses calendar days (UTC), like dueLabel: a request due today is not overdue yet. */
export async function requestCounts(db: Db, site: string, now = Date.now()) {
	const row = await db
		.prepare(
			"SELECT count(*) AS open, coalesce(sum(due_at / 86400000 < ?), 0) AS overdue FROM privacy_requests WHERE site = ? AND status IN ('new', 'in_progress')"
		)
		.bind(Math.floor(now / DAY_MS), site)
		.first<{ open: number; overdue: number }>();
	return { open: Number(row?.open ?? 0), overdue: Number(row?.overdue ?? 0) };
}

/** "Due in 12 days" / "Due today" / "Overdue by 3 days" (calendar days, UTC). */
export function dueLabel(dueAt: number, now: number): { text: string; overdue: boolean } {
	const days = Math.floor(dueAt / DAY_MS) - Math.floor(now / DAY_MS);
	if (days > 0) return { text: `Due in ${days} day${days === 1 ? '' : 's'}`, overdue: false };
	if (days === 0) return { text: 'Due today', overdue: false };
	return { text: `Overdue by ${-days} day${days === -1 ? '' : 's'}`, overdue: true };
}
