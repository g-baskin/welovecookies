import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createD1TestDb } from '#lib/test-support/d1-db.ts';

const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('#lib/server/db/index.ts', async () => ({
	getDb: () => holder.db,
	schema: await import('#lib/server/db/schema.ts')
}));
vi.mock('#lib/server/email.ts', () => ({ sendEmail: vi.fn(async () => ({ status: 'logged' })) }));

import { countOpenRequests, createPrivacyRequest, dueDaysFor, updateRequest } from './requests.ts';
import { dueLabel } from '#lib/admin/privacy/requests-display.ts';

let t: ReturnType<typeof createD1TestDb>;
beforeEach(() => {
	t = createD1TestDb();
	holder.db = t.db;
});
afterEach(() => t.close());

const base = {
	kind: 'copy' as const,
	email: 'a@b.co',
	name: '',
	message: '',
	customerId: null,
	consentId: null,
	country: 'DE',
	regionCode: null
};

describe('privacy requests', () => {
	it('answer days follow the strictest law', () => {
		expect([dueDaysFor('DE'), dueDaysFor('US'), dueDaysFor('BR'), dueDaysFor(null)]).toEqual([
			30, 45, 15, 30
		]);
	});
	it('limits open requests per email per day and counts open ones', async () => {
		for (let i = 0; i < 3; i++) expect((await createPrivacyRequest(base)).ok).toBe(true);
		const fourth = await createPrivacyRequest(base);
		expect(fourth.ok).toBe(false);
		expect(await countOpenRequests()).toBe(3);
		const next = await createPrivacyRequest(base, Date.now() + 86_400_001);
		expect(next.ok).toBe(true);
		if (!next.ok) return;
		expect(await updateRequest(next.id, 'done', 'ok')).toBe(true);
		expect(await countOpenRequests()).toBe(3);
	});
	it('due labels', () => {
		const now = Date.parse('2026-11-03T12:00:00Z');
		expect(dueLabel(now + 12 * 86_400_000, now).text).toBe('Due in 12 days');
		expect(dueLabel(now, now).text).toBe('Due today');
		expect(dueLabel(now - 3 * 86_400_000, now)).toEqual({
			text: 'Overdue by 3 days',
			overdue: true
		});
	});
});
