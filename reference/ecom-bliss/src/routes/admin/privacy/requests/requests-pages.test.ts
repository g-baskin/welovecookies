import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import { createD1TestDb } from '#lib/test-support/d1-db.ts';

const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('#lib/server/db/index.ts', async () => ({
	getDb: () => holder.db,
	schema: await import('#lib/server/db/schema.ts')
}));

import * as schema from '#lib/server/db/schema.ts';
import { insertConsentRecord } from '#lib/server/consent/log.ts';
import * as list from './+page.server.ts';
import ListPage from './+page.svelte';
import * as one from './[id]/+page.server.ts';
import OnePage from './[id]/+page.svelte';

let t: ReturnType<typeof createD1TestDb>;
const db = () =>
	t.db as never as {
		insert: (x: unknown) => { values: (v: unknown) => Promise<unknown> };
		select: () => { from: (x: unknown) => { all: () => Promise<Record<string, unknown>[]> } };
	};
beforeEach(() => {
	t = createD1TestDb();
	holder.db = t.db;
});
afterEach(() => t.close());

const DAY = 86_400_000;
const NOW = Date.now();
async function seed() {
	await db()
		.insert(schema.customers)
		.values({
			id: 'cus_abc123',
			email: 'kim@shop.co',
			firstName: 'Kim',
			lastName: 'Lee',
			phone: '555-1234',
			acceptsMarketing: true,
			defaultAddress: {
				firstName: 'Kim',
				lastName: 'Lee',
				address1: '1 Main St',
				city: 'Berlin',
				zip: '10115',
				country: 'DE'
			}
		});
	await db().insert(schema.orders).values({
		id: 'ord_zzz999',
		number: 1042,
		customerId: 'cus_abc123',
		email: 'kim@shop.co',
		subtotal: 2500,
		total: 2500
	});
	await db().insert(schema.orderItems).values({
		id: 'oi_1',
		orderId: 'ord_zzz999',
		title: 'Love Knot Necklace',
		quantity: 2,
		price: 1250
	});
	const r = (id: string, kind: string, status: string, extra: Record<string, unknown> = {}) =>
		db()
			.insert(schema.privacyRequests)
			.values({
				id,
				kind,
				status,
				email: 'kim@shop.co',
				createdAt: NOW - 40 * DAY,
				dueAt: NOW - 3 * DAY,
				country: 'DE',
				...extra
			});
	await r('preq_a', 'stop_selling', 'in_progress', {
		customerId: 'cus_abc123',
		consentId: 'abcdefghijklmnop',
		country: 'US',
		regionCode: 'CA'
	});
	await r('preq_b', 'delete', 'new', { dueAt: NOW + 12 * DAY + 1000 });
	await r('preq_c', 'copy', 'done', { closedAt: NOW });
	await insertConsentRecord({
		consent: {
			id: 'abcdefghijklmnop',
			at: NOW,
			mode: 'opt-out-gpc',
			rev: 1,
			action: 'accept_all',
			grants: { preferences: false, analytics: true, marketing: true }
		},
		country: 'US',
		regionCode: 'CA',
		lang: 'en',
		device: 'phone',
		gpc: false,
		page: '/',
		userAgent: 'x',
		customerId: 'cus_abc123'
	});
}
const load = (q: string) =>
	list.load({
		locals: { adminId: 'adm_owner' },
		url: new URL(`https://store.test/admin/privacy/requests${q}`),
		setHeaders: () => {}
	} as never) as Promise<Record<string, unknown>>;
const html = async (q: string) =>
	render(ListPage as never, { props: { data: await load(q), form: null } as never }).body;
const PLAIN_BAD = [
	'stop_selling',
	'in_progress',
	'>US<',
	'>DE<',
	'>CA<',
	'cus_abc123',
	'ord_zzz999',
	'opt-out-gpc',
	'accept_all'
];

describe('Privacy requests admin', () => {
	it('empty state says what to do', async () => {
		expect(await html('?show=all')).toContain(
			'Shoppers can ask from the Your privacy choices page.'
		);
	});

	it('filters, labels and never shows technical names', async () => {
		await seed();
		const open = await html('');
		expect(open).toContain("Don't sell or share my information");
		expect(open).toContain('Working on it');
		expect(open).toContain('Overdue by 3 days');
		expect(open).toContain('Due in 12 days');
		expect(open).toContain('California, United States');
		expect(open).toContain('Signed in when asking');
		expect(open).toContain('/admin/privacy?tab=records&amp;id=abcdefghijklmnop');
		expect(open).not.toContain('Send me a copy');
		for (const bad of PLAIN_BAD) expect(open).not.toContain(bad);
		const done = await html('?show=done');
		expect(done).toContain('Send me a copy');
		expect(done).not.toContain('Delete my data');
		expect((await load('?show=all')).requests).toHaveLength(3);
		expect((await load('')).openRequests).toBe(2);
	});

	it('closing sets closedAt, reopening clears it', async () => {
		await seed();
		const save = (status: string) => {
			const body = new FormData();
			body.set('id', 'preq_b');
			body.set('status', status);
			body.set('note', 'Asked for ID');
			return list.actions.save({
				locals: { adminId: 'adm_owner' },
				url: new URL('https://store.test/admin/privacy/requests'),
				request: new Request('https://store.test/admin/privacy/requests?/save', {
					method: 'POST',
					body,
					headers: { origin: 'https://store.test' }
				})
			} as never);
		};
		const get = async () =>
			(await db().select().from(schema.privacyRequests).all()).find((r) => r.id === 'preq_b');
		expect(await save('declined')).toMatchObject({ success: 'Saved.' });
		expect((await get())?.closedAt).toBeTypeOf('number');
		expect((await get())?.note).toBe('Asked for ID');
		await save('working');
		expect((await get())?.closedAt).toBeNull();
		const anon = await list.actions.save({
			locals: { adminId: null },
			url: new URL('https://store.test/x'),
			request: new Request('https://store.test/x', { method: 'POST', body: new FormData() })
		} as never);
		expect(anon).toMatchObject({ status: 401 });
	});

	it('"What we hold about them" summarizes in plain words', async () => {
		await seed();
		const data = await one.load({
			locals: { adminId: 'adm_owner' },
			params: { id: 'preq_a' },
			setHeaders: () => {}
		} as never);
		const body = render(OnePage as never, { props: { data } as never }).body;
		for (const want of [
			'Kim Lee',
			'555-1234',
			'Agreed to receive them',
			'1 Main St',
			'Germany',
			'Order #1042',
			'2 × Love Knot Necklace',
			'Accepted all',
			'Analytics: Allowed',
			"Don't sell or share my information",
			'Working on it',
			'Print'
		])
			expect(body).toContain(want);
		for (const bad of PLAIN_BAD) expect(body).not.toContain(bad);
		await expect(
			one.load({
				locals: { adminId: null },
				params: { id: 'preq_a' },
				setHeaders: () => {}
			} as never)
		).rejects.toMatchObject({ status: 401 });
	});
});
