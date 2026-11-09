// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest';

afterEach(() => window.WeLoveCookies?.destroy?.());

it('layers config: defaults, then data-*, then WeLoveCookiesConfig, then init() args', async () => {
	const s = document.createElement('script');
	Object.assign(s.dataset, { mode: 'opt-out', lang: 'fr', auto: 'false' });
	Object.defineProperty(document, 'currentScript', { configurable: true, get: () => s });
	await import('./standalone.ts');
	const api = window.WeLoveCookies!;
	expect(api.get).toBeUndefined(); // data-auto="false" skips the automatic start
	expect(api.init().get()).toMatchObject({ mode: 'opt-out', lang: 'fr' });
	window.WeLoveCookiesConfig = { lang: 'de' };
	expect(api.init().get()).toMatchObject({ mode: 'opt-out', lang: 'de' });
	expect(api.init({ mode: 'opt-in' }).get()).toMatchObject({ mode: 'opt-in', lang: 'de' });
	expect(document.querySelectorAll('we-love-cookies')).toHaveLength(1); // re-init replaces the old banner
});
