import { describe, expect, it, vi } from 'vitest';
import {
	applyDefaults,
	applyGrants,
	applyPostHog,
	type PostHogLike,
	type SignalTarget
} from './signals.ts';
import { ALL_GRANTED, NONE_GRANTED } from './types.ts';

const argsOf = (dl: unknown[]) =>
	dl.map((a) =>
		Array.isArray(a) || typeof a !== 'object' || !a || 'event' in a
			? a
			: Array.from(a as ArrayLike<unknown>)
	);

function fakePh(optedIn: boolean): PostHogLike & { calls: string[] } {
	const calls: string[] = [];
	return {
		calls,
		has_opted_in_capturing: () => optedIn,
		opt_in_capturing: () => calls.push('in'),
		opt_out_capturing: () => calls.push('out'),
		reset: () => calls.push('reset')
	};
}

describe('signals', () => {
	it('creates a gtag stub and sets defaults then updates', () => {
		const w: SignalTarget = {};
		applyDefaults(w, NONE_GRANTED);
		applyGrants(w, { preferences: false, analytics: true, marketing: false });
		const dl = argsOf(w.dataLayer ?? []);
		expect(dl[0]).toEqual([
			'consent',
			'default',
			expect.objectContaining({
				ad_storage: 'denied',
				analytics_storage: 'denied',
				functionality_storage: 'granted',
				security_storage: 'granted',
				wait_for_update: 500
			})
		]);
		expect(dl[1]).toEqual([
			'consent',
			'update',
			expect.objectContaining({
				analytics_storage: 'granted',
				ad_user_data: 'denied',
				personalization_storage: 'denied'
			})
		]);
		expect(dl[2]).toEqual({
			event: 'welovecookies_update',
			preferences: false,
			analytics: true,
			marketing: false
		});
		expect(w.uetq).toEqual([
			'consent',
			'default',
			{ ad_storage: 'denied' },
			'consent',
			'update',
			{ ad_storage: 'denied' }
		]);
	});
	it('uses existing vendors and never throws', () => {
		const gtag = vi.fn();
		const fbq = vi.fn();
		const ttq = { holdConsent: vi.fn(), grantConsent: vi.fn(), revokeConsent: vi.fn() };
		const w: SignalTarget = { gtag, fbq, ttq, dataLayer: [] };
		applyDefaults(w, ALL_GRANTED);
		expect(ttq.holdConsent).toHaveBeenCalled();
		applyGrants(w, ALL_GRANTED);
		expect(fbq).toHaveBeenCalledWith('consent', 'grant');
		expect(ttq.grantConsent).toHaveBeenCalled();
		applyGrants(w, NONE_GRANTED);
		expect(fbq).toHaveBeenLastCalledWith('consent', 'revoke');
		expect(ttq.revokeConsent).toHaveBeenCalled();
		const bad: SignalTarget = {
			fbq: () => {
				throw new Error('x');
			},
			gtag: () => {
				throw new Error('y');
			}
		};
		expect(() => applyGrants(bad, ALL_GRANTED)).not.toThrow();
		expect(() =>
			applyGrants(w, ALL_GRANTED, { googleConsentMode: false, meta: false })
		).not.toThrow();
	});
	it('drives PostHog', () => {
		const a = fakePh(false);
		applyPostHog(a, true);
		expect(a.calls).toEqual(['in']);
		const b = fakePh(true);
		applyPostHog(b, true);
		expect(b.calls).toEqual([]);
		applyPostHog(b, false);
		expect(b.calls).toEqual(['reset', 'out']);
		const c = fakePh(false);
		applyGrants({ posthog: c }, ALL_GRANTED, {}, { pending: true });
		expect(c.calls).toEqual([]);
	});
});
