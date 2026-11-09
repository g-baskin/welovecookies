import { error, fail } from '@sveltejs/kit';
import { rejectAdminWrite } from '#lib/admin/server/admin-write.ts';
import {
	countOpenRequests,
	isStatus,
	listRequests,
	REQUEST_FILTERS,
	updateRequest,
	type RequestFilter
} from '#lib/server/privacy/requests.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
	if (!locals.adminId) error(401, 'Sign in to view privacy requests.');
	setHeaders({ 'cache-control': 'private, no-store' });
	const raw = url.searchParams.get('show');
	const filter: RequestFilter = (REQUEST_FILTERS as readonly string[]).includes(raw ?? '')
		? (raw as RequestFilter)
		: 'open';
	return {
		filter,
		now: Date.now(),
		requests: await listRequests(filter),
		openRequests: await countOpenRequests()
	};
};

export const actions: Actions = {
	save: async (event) => {
		const denied = rejectAdminWrite(event);
		if (denied) return denied;
		const f = await event.request.formData();
		const id = String(f.get('id') ?? '');
		const raw = f.get('status');
		// The form sends 'working' so no code value appears in the page.
		const status = raw === 'working' ? 'in_progress' : raw;
		if (!isStatus(status)) return fail(400, { error: 'Choose a status.' });
		const ok = await updateRequest(id, status, String(f.get('note') ?? '').trim());
		if (!ok) return fail(404, { error: 'That request no longer exists.' });
		return { success: 'Saved.', id };
	}
};
