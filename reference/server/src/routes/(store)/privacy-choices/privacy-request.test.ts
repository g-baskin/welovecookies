import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import { createD1TestDb } from '#lib/test-support/d1-db.ts';

const holder = vi.hoisted(() => ({
	db: null as unknown,
	sent: [] as { to: string; subject: string }[]
}));
vi.mock('#lib/server/db/index.ts', async () => ({
	getDb: () => holder.db,
	schema: await import('#lib/server/db/schema.ts')
}));
vi.mock('#lib/server/email.ts', () => ({
	sendEmail: vi.fn(async (m: { to: string; subject: string }) => {
		holder.sent.push(m);
		return { status: 'logged' };
	})
}));

import * as schema from '#lib/server/db/schema.ts';
import { createSession } from '#lib/server/auth.ts';
import { setSetting } from '#lib/server/settings.ts';
import { cookieJar } from '#lib/test-support/cookies.ts';
import * as server from './+page.server.ts';
import Page from './+page.svelte';

let t: ReturnType<typeof createD1TestDb>;
beforeEach(() => {
	t = createD1TestDb();
	holder.db = t.db;
	holder.sent = [];
});
afterEach(() => t.close());

const DAY = 86_400_000;
function post(
	fields: Record<string, string>,
	cf: Record<string, string> = {},
	customerId: string | null = null
) {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.set(k, v);
	return {
		locals: { adminId: null, customerId },
		url: new URL('https://store.test/privacy-choices?/request'),
		request: new Request('https://store.test/privacy-choices?/request', { method: 'POST', body }),
		cookies: { get: () => undefined },
		platform: { cf }
	} as never;
}
const act = (e: never) => server.actions.request(e) as Promise<Record<string, unknown>>;
const rows = () =>
	(
		t.db as never as {
			select: () => {
				from: (x: unknown) => {
					all: () => Promise<(typeof schema.privacyRequests.$inferSelect)[]>;
				};
			};
		}
	)
		.select()
		.from(schema.privacyRequests)
		.all();

describe('Ask about your data', () => {
	it('saves a request with the right due days per place and emails owner + shopper', async () => {
		await setSetting('store.email', 'owner@shop.co');
		const cases: [Record<string, string>, number][] = [
			[{ country: 'DE' }, 30],
			[{ country: 'US', regionCode: 'CA' }, 45],
			[{ country: 'BR' }, 15],
			[{}, 30]
		];
		for (const [i, [cf, days]] of cases.entries()) {
			const res = await act(
				post({ kind: 'delete', email: `S${i}@Example.com`, name: 'Sam', message: 'hi' }, cf)
			);
			expect(res).toEqual({ requestSent: { email: `s${i}@example.com`, days } });
		}
		const saved = await rows();
		expect(saved).toHaveLength(4);
		for (const r of saved) {
			const days = (r.dueAt - r.createdAt) / DAY;
			const want = r.country === 'US' ? 45 : r.country === 'BR' ? 15 : 30;
			expect(days).toBe(want);
			expect(JSON.stringify(r)).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
		}
		expect(saved.find((r) => r.country === 'US')?.regionCode).toBe('CA');
		expect(holder.sent.map((m) => m.subject)).toContain('New privacy request: Delete my data');
		expect(holder.sent.some((m) => m.to === 's0@example.com')).toBe(true);
	});

	it('honeypot pretends success and stores nothing', async () => {
		const res = await act(post({ kind: 'copy', email: 'bot@x.co', website: 'http://spam' }));
		expect(res).toHaveProperty('requestSent');
		expect(await rows()).toHaveLength(0);
		expect(holder.sent).toHaveLength(0);
	});

	it('links a signed-in shopper even though only /account pages fill locals.customerId', async () => {
		await t.db.insert(schema.customers).values({ id: 'cust_1', email: 'sam@shop.co' });
		const jar = cookieJar();
		await createSession(jar.cookies, 'customer', 'cust_1', false);
		const event = {
			...(post({ kind: 'copy', email: 'typo@x.co' }) as object),
			cookies: jar.cookies
		};
		const res = await act(event as never);
		expect(res).toEqual({ requestSent: { email: 'sam@shop.co', days: 30 } });
		const [saved] = await rows();
		expect(saved?.customerId).toBe('cust_1');
		expect(saved?.email).toBe('sam@shop.co');
		const data = (await server.load({
			...(post({}) as object),
			cookies: jar.cookies
		} as never)) as { signedInEmail: string | null };
		expect(data.signedInEmail).toBe('sam@shop.co');
	});

	it('limits to 3 open requests per email per day', async () => {
		for (let i = 0; i < 3; i++) await act(post({ kind: 'copy', email: 'a@b.co' }));
		const res = await act(post({ kind: 'copy', email: 'a@b.co' }));
		expect(res.status).toBe(429);
		expect(JSON.stringify(res)).toContain('try again tomorrow');
		expect(await rows()).toHaveLength(3);
	});

	it('explains a bad email in plain words and keeps what they typed', async () => {
		const res = (await act(post({ kind: 'copy', email: 'not-an-email', name: 'Sam' }))) as {
			status: number;
			data: { requestError: string; values: { name: string } };
		};
		expect(res.status).toBe(400);
		expect(res.data.requestError).toBe('Enter a valid email address, like name@example.com.');
		expect(res.data.values.name).toBe('Sam');
		const html = render(
			Page as never,
			{
				props: {
					data: {
						region: 'optout',
						consent: 'not_required',
						optIn: false,
						doNotSell: true,
						gpc: false,
						grants: { preferences: false, analytics: true, marketing: true },
						chosen: false,
						consentId: null,
						chosenAt: null,
						preferencesCategory: false,
						cookies: [],
						signedInEmail: null,
						replyDays: 45
					},
					form: res.data
				}
			} as never
		).body;
		expect(html).toContain('Enter a valid email address');
		expect(html.indexOf("Don't sell or share")).toBeLessThan(html.indexOf('Delete my data'));
	});
});
