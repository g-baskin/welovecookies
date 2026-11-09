// Opens the admin customer page for a request without putting the customer id in the list page.
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.adminId) error(401, 'Sign in to view this.');
	const row = await getDb()
		.select({ customerId: schema.privacyRequests.customerId })
		.from(schema.privacyRequests)
		.where(eq(schema.privacyRequests.id, params.id))
		.get();
	if (!row?.customerId) error(404, 'No account is linked to this request.');
	redirect(303, `/admin/customers/${row.customerId}`);
};
