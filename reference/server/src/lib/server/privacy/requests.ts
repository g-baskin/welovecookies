/**
 * We Love Cookies: shopper privacy requests (delete, copy, correct, stop selling/sharing).
 * Never stores an IP address. Never changes customer data by itself. Not legal advice.
 */
import { and, desc, eq, gte, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, schema } from '#lib/server/db/index.ts';
import { newId } from '#lib/server/db/ids.ts';
import { getSetting } from '#lib/server/settings.ts';
import { sendEmail } from '#lib/server/email.ts';
import { kindLabel } from '#lib/admin/privacy/requests-display.ts';
import {
	PRIVACY_REQUEST_KINDS,
	PRIVACY_REQUEST_STATUSES,
	type PrivacyRequestKind,
	type PrivacyRequestStatus
} from '#lib/consent/types.ts';

const pr = schema.privacyRequests;
const DAY = 86_400_000;
export const OPEN_STATUSES = ['new', 'in_progress'] as const;
export const DAILY_LIMIT = 3;

/** Days to answer, by the strictest law where the shopper is: Brazil 15, US 45, everyone else 30. */
export function dueDaysFor(country: string | null | undefined): number {
	const c = (country ?? '').toUpperCase();
	if (c === 'BR') return 15;
	if (c === 'US') return 45;
	return 30;
}

export const requestFormSchema = z.object({
	kind: z.enum(PRIVACY_REQUEST_KINDS, { error: 'Choose what you would like us to do.' }),
	email: z
		.string()
		.trim()
		.toLowerCase()
		.max(254, { error: 'That email address is too long.' })
		.pipe(z.email({ error: 'Enter a valid email address, like name@example.com.' })),
	name: z.string().trim().max(120, { error: 'Please keep your name under 120 characters.' }),
	message: z
		.string()
		.trim()
		.max(1000, { error: 'Please keep your message under 1,000 characters.' })
});
export type RequestForm = z.infer<typeof requestFormSchema>;

export type CreateResult =
	{ ok: true; id: string; dueDays: number; dueAt: number } | { ok: false; error: string };

export async function createPrivacyRequest(
	input: RequestForm & {
		customerId: string | null;
		consentId: string | null;
		country: string | null;
		regionCode: string | null;
	},
	now = Date.now()
): Promise<CreateResult> {
	const db = getDb();
	const recent = await db
		.select({ id: pr.id })
		.from(pr)
		.where(
			and(
				eq(pr.email, input.email),
				inArray(pr.status, [...OPEN_STATUSES]),
				gte(pr.createdAt, now - DAY)
			)
		)
		.all();
	if (recent.length >= DAILY_LIMIT)
		return {
			ok: false,
			error:
				"You've already sent us several requests today. We'll answer those first; please try again tomorrow."
		};
	const dueDays = dueDaysFor(input.country);
	const id = newId('preq');
	const dueAt = now + dueDays * DAY;
	await db.insert(pr).values({
		id,
		createdAt: now,
		kind: input.kind,
		status: 'new',
		email: input.email,
		name: input.name,
		message: input.message,
		consentId: input.consentId,
		customerId: input.customerId,
		country: input.country,
		regionCode: input.regionCode,
		dueAt
	});
	return { ok: true, id, dueDays, dueAt };
}

const esc = (s: string) =>
	s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c
	);

/** Owner alert + shopper receipt. Never throws: a failed email must not lose the request. */
export async function notifyPrivacyRequest(
	req: { id: string; kind: PrivacyRequestKind; email: string; dueDays: number },
	origin: string
): Promise<{ owner: boolean; shopper: boolean }> {
	const out = { owner: false, shopper: false };
	const plain = kindLabel(req.kind);
	try {
		const owner = await getSetting('store.email', '');
		if (owner) {
			const link = `${origin}/admin/privacy/requests`;
			const subject = `New privacy request: ${plain}`;
			await sendEmail({
				to: owner,
				subject,
				text: `${subject}\nFrom: ${req.email}\nPlease answer within ${req.dueDays} days.\nOpen it: ${link}`,
				html: `<p style="font-size:18px;font-weight:600">${esc(subject)}</p><p>From: ${esc(req.email)}</p><p>Please answer within ${req.dueDays} days.</p><p><a href="${esc(link)}">Open privacy requests</a></p>`,
				idempotencyKey: `privacy-request-owner/${req.id}`
			});
			out.owner = true;
		}
	} catch (e) {
		console.error('[privacy] owner email failed', e instanceof Error ? e.message : e);
	}
	try {
		const store = await getSetting('store.name', 'our shop');
		const subject = `We got your privacy request`;
		await sendEmail({
			to: req.email,
			subject,
			text: `Thanks. ${store} received your request: ${plain}. We'll reply by email within ${req.dueDays} days. We may ask you to confirm it's you first.`,
			html: `<p>Thanks. ${esc(store)} received your request: <strong>${esc(plain)}</strong>.</p><p>We'll reply by email within ${req.dueDays} days. We may ask you to confirm it's you first.</p>`,
			idempotencyKey: `privacy-request-receipt/${req.id}`
		});
		out.shopper = true;
	} catch (e) {
		console.error('[privacy] receipt email failed', e instanceof Error ? e.message : e);
	}
	return out;
}

/** New + working-on-it requests (shown as the Requests tab count). */
export async function countOpenRequests(): Promise<number> {
	const rows = await getDb()
		.select({ id: pr.id })
		.from(pr)
		.where(inArray(pr.status, [...OPEN_STATUSES]))
		.all();
	return rows.length;
}

export const REQUEST_FILTERS = ['open', 'done', 'all'] as const;
export type RequestFilter = (typeof REQUEST_FILTERS)[number];

export async function listRequests(filter: RequestFilter) {
	const db = getDb();
	const base = db.select().from(pr);
	const rows =
		filter === 'all'
			? await base.orderBy(desc(pr.createdAt)).all()
			: await base
					.where(inArray(pr.status, filter === 'open' ? [...OPEN_STATUSES] : ['done', 'declined']))
					.orderBy(filter === 'open' ? pr.dueAt : desc(pr.createdAt))
					.all();
	return rows;
}

export const isStatus = (s: unknown): s is PrivacyRequestStatus =>
	(PRIVACY_REQUEST_STATUSES as readonly unknown[]).includes(s);

/** Owner update. Closing (done/declined) stamps closedAt; reopening clears it. */
export async function updateRequest(
	id: string,
	status: PrivacyRequestStatus,
	note: string,
	now = Date.now()
): Promise<boolean> {
	const db = getDb();
	const row = await db.select().from(pr).where(eq(pr.id, id)).get();
	if (!row) return false;
	const closing = status === 'done' || status === 'declined';
	await db
		.update(pr)
		.set({ status, note: note.slice(0, 2000), closedAt: closing ? (row.closedAt ?? now) : null })
		.where(eq(pr.id, id));
	return true;
}
