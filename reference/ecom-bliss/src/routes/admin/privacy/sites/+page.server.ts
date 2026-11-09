import { countOpenRequests } from '#lib/server/privacy/requests.ts';
import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { rejectAdminWrite } from '#lib/admin/server/admin-write.ts';
import { getDb, schema } from '#lib/server/db/index.ts';
import {
	getSite,
	listSites,
	newSiteKey,
	newSiteSchema,
	plainHost,
	SITE_KEY_RE
} from '#lib/server/consent/sites.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
	if (!locals.adminId) error(401, 'Sign in to view your other websites.');
	setHeaders({ 'cache-control': 'private, no-store' });
	const sites = await listSites();
	return {
		openRequests: await countOpenRequests().catch(() => 0),
		storeHost: url.host,
		sites: sites.map((s) => ({
			key: s.id,
			name: s.name,
			host: plainHost(s.origin),
			privacyUrl: s.privacyUrl,
			enabled: !!s.enabled,
			records30: s.records30,
			snippet: `<script src="${url.origin}/consent/ecom-cookie.min.js" data-site="${s.id}" async></script>`
		}))
	};
};

const keySchema = z.object({ key: z.string().regex(SITE_KEY_RE) });
const field = (f: FormData, k: string) => String(f.get(k) ?? '');

async function siteFrom(f: FormData) {
	const ok = keySchema.safeParse({ key: field(f, 'key') });
	return ok.success ? getSite(ok.data.key) : null;
}

export const actions: Actions = {
	add: async (event) => {
		const rejected = rejectAdminWrite(event);
		if (rejected) return rejected;
		const f = await event.request.formData();
		const parsed = newSiteSchema.safeParse({
			name: field(f, 'name'),
			address: field(f, 'address'),
			privacy: field(f, 'privacy')
		});
		if (!parsed.success)
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Check the form.' });
		const { name, address, privacy } = parsed.data;
		if (address === event.url.origin)
			return fail(400, { error: 'That is this store. The banner already runs here.' });
		const taken = await getDb()
			.select({ id: schema.consentSites.id })
			.from(schema.consentSites)
			.where(eq(schema.consentSites.origin, address))
			.get();
		if (taken) return fail(400, { error: 'That website is already in your list.' });
		await getDb()
			.insert(schema.consentSites)
			.values({
				id: newSiteKey(),
				name,
				origin: address,
				privacyUrl: privacy,
				enabled: 1,
				createdAt: Date.now()
			})
			.run();
		return { success: `Added ${name}. Copy its code below and paste it into the website.` };
	},
	toggle: async (event) => {
		const rejected = rejectAdminWrite(event);
		if (rejected) return rejected;
		const site = await siteFrom(await event.request.formData());
		if (!site) return fail(404, { error: 'That website is no longer in your list.' });
		const enabled = site.enabled ? 0 : 1;
		await getDb()
			.update(schema.consentSites)
			.set({ enabled })
			.where(eq(schema.consentSites.id, site.id))
			.run();
		return {
			success: enabled
				? `The banner is on again for ${site.name}.`
				: `The banner is off for ${site.name}. Its past records are kept.`
		};
	},
	remove: async (event) => {
		const rejected = rejectAdminWrite(event);
		if (rejected) return rejected;
		const site = await siteFrom(await event.request.formData());
		if (!site) return fail(404, { error: 'That website is no longer in your list.' });
		await getDb().delete(schema.consentSites).where(eq(schema.consentSites.id, site.id)).run();
		return {
			success: `Removed ${site.name}. Its past records are kept and show as “Removed website”.`
		};
	}
};
