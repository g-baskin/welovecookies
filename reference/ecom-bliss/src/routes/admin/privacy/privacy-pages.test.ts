import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import { createD1TestDb } from '#lib/test-support/d1-db.ts';

const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('#lib/server/db/index.ts', async () => ({
	getDb: () => holder.db,
	schema: await import('#lib/server/db/schema.ts')
}));

import { bumpConsentDaily, insertConsentRecord } from '#lib/server/consent/log.ts';
import * as server from './+page.server.ts';
import Page from './+page.svelte';
import * as csv from './records.csv/+server.ts';

let t: ReturnType<typeof createD1TestDb>;
beforeEach(() => {
	t = createD1TestDb();
	holder.db = t.db;
});
afterEach(() => t.close());

const load = (q: string) =>
	server.load({
		locals: { adminId: 'adm_owner' },
		url: new URL(`https://store.test/admin/privacy${q}`),
		setHeaders: () => {}
	} as never) as Promise<Record<string, unknown>>;
const html = async (q: string, form: unknown = null) =>
	render(Page as never, { props: { data: await load(q), form } as never }).body;

describe('Privacy & cookies admin', () => {
	it('every tab renders with no data and says what to do', async () => {
		expect(await html('')).toContain('No visitors have seen the banner yet');
		const banner = await html('?tab=banner');
		expect(banner).toContain('Preview on my store');
		expect(banner).toContain('consent_preview=opt-out-gpc');
		expect(banner).toContain('/admin/ads/tracking');
		const cookiesTab = await html('?tab=cookies');
		expect(cookiesTab).toContain('eb_cart');
		expect(cookiesTab).toContain('Your shopping bag');
		expect(await html('?tab=records')).toContain('No choices recorded yet');
		expect(await html('?tab=banner', { success: 'Saved.' })).toContain('Saved.');
	});

	it('shows numbers and records, and purges records older than 5 years', async () => {
		const now = Date.now();
		await bumpConsentDaily('seen', 'opt-in', 'DE', 'phone', now);
		await bumpConsentDaily('seen', 'opt-in', 'DE', 'phone', now);
		await bumpConsentDaily('accept_all', 'opt-in', 'DE', 'phone', now);
		const rec = (id: string, at: number) =>
			insertConsentRecord({
				consent: {
					id,
					at,
					mode: 'opt-in',
					rev: 1,
					action: 'accept_all',
					grants: { preferences: false, analytics: true, marketing: true }
				},
				country: 'DE',
				regionCode: null,
				lang: 'de',
				device: 'phone',
				gpc: false,
				page: '/',
				userAgent: 'x',
				customerId: null
			});
		await rec('abcdefghijklmnop', now);
		await rec('oldoldoldoldoldo', now - 6 * 365 * 86_400_000);
		const overview = await html('?days=7');
		expect(overview).toContain('50%');
		expect(overview).toContain('Germany');
		const records = await html('?tab=records');
		expect(records).toContain('abcdefghijklmnop');
		expect(records).toContain('Accepted all');
		for (const code of ['accept_all', 'opt-in', '>DE<']) expect(records).not.toContain(code);
		const day = new Date(now).toISOString().slice(0, 10);
		const res = await csv.GET({
			locals: { adminId: 'adm_owner' },
			url: new URL(`https://store.test/admin/privacy/records.csv?from=${day}&to=${day}`)
		} as never);
		const sheet = await res.text();
		expect(sheet).toContain('Accepted all');
		expect(sheet).toContain('Germany');
		expect(sheet).toContain('German');
		for (const code of ['accept_all', 'opt-in', 'Customer ID', ',DE,', ',de,', 'phone'])
			expect(sheet).not.toContain(code);
		expect(records).not.toContain('oldoldoldoldoldo');
		expect(t.sqlite.prepare('select count(*) n from consent_records').get()?.n).toBe(1);
		expect(await html('?tab=records&id=zzzzzzzzzzzzzzzz')).toContain(
			'No records for this reference'
		);
	});
});
