import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import { createD1TestDb } from '#lib/test-support/d1-db.ts';

const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('#lib/server/db/index.ts', async () => ({
	getDb: () => holder.db,
	schema: await import('#lib/server/db/schema.ts')
}));

import { insertConsentRecord } from '#lib/server/consent/log.ts';
import * as server from './+page.server.ts';
import Page from './+page.svelte';
import * as main from '../+page.server.ts';
import MainPage from '../+page.svelte';
import * as csv from '../records.csv/+server.ts';

let t: ReturnType<typeof createD1TestDb>;
beforeEach(() => {
	t = createD1TestDb();
	holder.db = t.db;
});
afterEach(() => t.close());

const ORIGIN = 'https://store.test';
const load = async () =>
	(await server.load({
		locals: { adminId: 'adm_owner' },
		url: new URL(`${ORIGIN}/admin/privacy/sites`),
		setHeaders: () => {}
	} as never)) as Record<string, unknown>;
const html = async (form: unknown = null) =>
	render(Page as never, { props: { data: await load(), form } as never }).body;
async function act(name: 'add' | 'toggle' | 'remove', fields: Record<string, string>) {
	const url = new URL(`${ORIGIN}/admin/privacy/sites?/${name}`);
	const res = await server.actions[name]({
		locals: { adminId: 'adm_owner' },
		url,
		request: new Request(url, {
			method: 'POST',
			headers: { origin: ORIGIN },
			body: new URLSearchParams(fields)
		})
	} as never);
	return res as { status?: number; data?: { error?: string }; success?: string };
}
const sites = () => t.sqlite.prepare('select * from consent_sites').all();
/** What a person reads: no tags or attribute values, with the install code taken out. */
const visible = (h: string) =>
	h
		.replace(/<code[\s\S]*?<\/code>/g, ' ')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<[^>]+>/g, ' ');

describe('Other websites admin', () => {
	it('empty state says what to do', async () => {
		const h = await html();
		expect(h).toContain('No other websites yet');
		expect(h).toContain('Use this banner on your other websites.');
	});

	it('adds, rejects bad addresses in plain words, toggles and removes keeping records', async () => {
		const bad = await act('add', {
			name: 'Blog',
			address: 'https://blog.example.com/posts',
			privacy: ''
		});
		expect(bad.status).toBe(400);
		expect(bad.data?.error).toContain('Enter just the website address');
		expect((await act('add', { name: 'Blog', address: 'not a site', privacy: '' })).status).toBe(
			400
		);
		const ok = await act('add', { name: 'Blog', address: 'Blog.Example.com/', privacy: '' });
		expect(ok.success).toContain('Added Blog');
		const [site] = sites();
		expect(site).toMatchObject({ origin: 'https://blog.example.com', enabled: 1 });
		const key = String(site?.id);
		expect(key).toMatch(/^ws_[A-Za-z0-9_-]{12}$/);
		expect(
			(await act('add', { name: 'Again', address: 'blog.example.com', privacy: '' })).status
		).toBe(400);

		const h = await html();
		expect(h).toContain(
			`<script src="${ORIGIN}/consent/welovecookies.min.js" data-site="${key}" async></script>`.replace(
				/</g,
				'&lt;'
			)
		);
		expect(h).toContain('Paste it into the head of every page, above your analytics and ad tags');
		const text = visible(h);
		expect(text).toContain('blog.example.com');
		for (const code of [key, 'ws_', 'https://blog', 'origin', 'site_id', 'enabled', 'JSON'])
			expect(text).not.toContain(code);

		await act('toggle', { key });
		expect(sites()[0]?.enabled).toBe(0);
		expect(visible(await html())).toContain('Banner off');
		await act('toggle', { key });
		expect(sites()[0]?.enabled).toBe(1);

		await insertConsentRecord({
			consent: {
				id: 'abcdefghijklmnop',
				at: Date.now(),
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
			customerId: null,
			site: key
		});
		const records = async () =>
			visible(
				render(MainPage as never, {
					props: {
						data: await main.load({
							locals: { adminId: 'adm_owner' },
							url: new URL(`${ORIGIN}/admin/privacy?tab=records`),
							setHeaders: () => {}
						} as never),
						form: null
					} as never
				}).body
			);
		expect(await records()).toContain('Blog');
		expect((await act('remove', { key })).success).toContain('Removed Blog');
		expect(sites()).toHaveLength(0);
		expect(t.sqlite.prepare('select count(*) n from consent_records').get()?.n).toBe(1);
		const after = await records();
		expect(after).toContain('Removed website');
		for (const code of [key, 'ws_', 'accept_all', 'opt-in']) expect(after).not.toContain(code);
		const day = new Date().toISOString().slice(0, 10);
		const sheet = await (
			await csv.GET({
				locals: { adminId: 'adm_owner' },
				url: new URL(`${ORIGIN}/admin/privacy/records.csv?from=${day}&to=${day}`)
			} as never)
		).text();
		expect(sheet).toContain('Website');
		expect(sheet).toContain('Removed website');
		expect(sheet).not.toContain(key);
	});

	it('refuses writes from another origin', async () => {
		const url = new URL(`${ORIGIN}/admin/privacy/sites?/add`);
		const res = (await server.actions.add({
			locals: { adminId: 'adm_owner' },
			url,
			request: new Request(url, {
				method: 'POST',
				headers: { origin: 'https://evil.test' },
				body: new URLSearchParams({ name: 'x', address: 'x.com' })
			})
		} as never)) as { status: number };
		expect(res.status).toBe(403);
	});
});
