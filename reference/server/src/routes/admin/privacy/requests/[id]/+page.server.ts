import { error } from '@sveltejs/kit';
import { dataSummary } from '#lib/server/privacy/summary.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	if (!locals.adminId) error(401, 'Sign in to view privacy requests.');
	setHeaders({ 'cache-control': 'private, no-store' });
	const summary = await dataSummary(params.id);
	if (!summary) error(404, 'That request no longer exists.');
	// Customer id only says whether an account exists; it is never shown.
	const { customer, ...rest } = summary;
	return {
		...rest,
		account: customer ? { ...customer, id: undefined } : null,
		requestId: params.id,
		printedAt: Date.now()
	};
};
