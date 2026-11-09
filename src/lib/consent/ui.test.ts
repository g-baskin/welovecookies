// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConsent } from './consent.ts';
import { decodeConsent, readCookie } from './cookie.ts';
import { builtInTexts } from './i18n.ts';
import { NONE_GRANTED, type ConsentConfig, type ConsentTexts } from './types.ts';
import { createUi, type UiHandlers, type UiState } from './ui.ts';

const texts = builtInTexts('en');

function mountUi(config: Partial<ConsentConfig> = {}, st: Partial<UiState> = {}) {
	const h: UiHandlers = {
		acceptAll: vi.fn(),
		rejectAll: vi.fn(),
		acknowledge: vi.fn(),
		save: vi.fn(),
		openPreferences: vi.fn()
	};
	const state: UiState = { texts, lang: 'en', rtl: false, gpc: false, doNotSell: false, compact: false, ...st }; // prettier-ignore
	const ui = createUi(document, { mode: 'opt-in', rev: 1, ...config }, state, h);
	const root = document.querySelector('we-love-cookies')!.shadowRoot!;
	const q = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel);
	const click = (sel: string) => q(sel)!.click();
	return { ui, h, root, q, click };
}

beforeEach(() => {
	(window as unknown as { happyDOM: { setURL(u: string): void } }).happyDOM.setURL('https://example.test/pricing');
});
afterEach(() => {
	vi.useRealTimers();
	document.body.innerHTML = '';
	document.cookie = 'wlc_consent=; path=/; max-age=0';
});

describe('banner', () => {
	it('full banner: labelled region whose buttons call accept, reject and choose', () => {
		const { ui, h, q, click } = mountUi();
		ui.banner('full');
		expect(q('section.bn')!.getAttribute('role')).toBe('region');
		expect(q('#ec-t')!.textContent).toBe(texts.title);
		expect(q('.bn .tx')!.textContent).toBe(texts.body);
		click('[data-a="accept"]');
		click('[data-a="reject"]');
		click('[data-a="choose"]');
		expect(h.acceptAll).toHaveBeenCalledOnce();
		expect(h.rejectAll).toHaveBeenCalledOnce();
		expect(h.openPreferences).toHaveBeenCalledOnce();
		ui.banner(null);
		expect(q('section.bn')).toBeNull();
	});

	it('notice banner: one OK button plus choose, and the do-not-sell link when the region needs it', () => {
		const { ui, h, q, root, click } = mountUi({ links: { privacyChoices: '/choices' } }, { doNotSell: true });
		ui.banner('notice');
		expect(q('.bn .tx')!.textContent).toBe(texts.noticeBody);
		expect(q('[data-a="accept"]')).toBeNull();
		click('[data-a="ok"]');
		expect(h.acknowledge).toHaveBeenCalledOnce();
		const a = [...root.querySelectorAll('.bn a')].find((n) => n.textContent === texts.doNotSell);
		expect(a?.getAttribute('href')).toBe('/choices');
	});

	it('shows owner text as text and drops unsafe links and logos', () => {
		const evil = '<img src=x onerror=alert(1)>';
		const { ui, q, root } = mountUi(
			{ links: { privacyPolicy: 'javascript:alert(1)', cookiePolicy: '/cookies' }, logoUrl: 'javascript:x' },
			{ texts: { ...texts, title: evil } as ConsentTexts }
		);
		ui.banner('full');
		expect(q('#ec-t')!.textContent).toBe(evil);
		expect(root.querySelector('.bn img')).toBeNull();
		const hrefs = [...root.querySelectorAll('.bn a')].map((n) => n.getAttribute('href'));
		expect(hrefs).toEqual(['/cookies']);
	});
});

describe('preferences panel', () => {
	it('shows switches for the grants, focuses the first one and saves what was toggled', () => {
		const { ui, h, q, root, click } = mountUi();
		ui.panel({ ...NONE_GRANTED, marketing: true });
		expect(q('.dl')!.getAttribute('aria-modal')).toBe('true');
		expect(q('[data-c="preferences"]')).toBeNull();
		expect(q('[data-c="analytics"]')!.getAttribute('aria-checked')).toBe('false');
		expect(q('[data-c="marketing"]')!.getAttribute('aria-checked')).toBe('true');
		expect(root.activeElement).toBe(q('[data-c="analytics"]'));
		click('[data-c="analytics"]');
		expect(q('[data-c="analytics"]')!.getAttribute('aria-checked')).toBe('true');
		click('[data-a="save"]');
		expect(h.save).toHaveBeenCalledWith({ preferences: false, analytics: true, marketing: true });
	});

	it('lists preferences only when the owner turns that category on', () => {
		const { ui, q } = mountUi({ preferencesCategory: true });
		ui.panel({ ...NONE_GRANTED });
		expect(q('[data-c="preferences"]')).not.toBeNull();
	});

	it('with GPC, locks marketing off and says so', () => {
		const { ui, h, q, click } = mountUi({}, { gpc: true });
		ui.panel({ ...NONE_GRANTED, marketing: true });
		expect(q<HTMLButtonElement>('[data-c="marketing"]')!.disabled).toBe(true);
		expect(q('.gp')!.textContent).toBe(texts.gpcHonored);
		click('[data-a="save"]');
		expect(h.save).toHaveBeenCalledWith({ preferences: false, analytics: false, marketing: false });
	});

	it('shows and hides the cookie table for a category', () => {
		const cookie = { name: '_ga', provider: 'Google', category: 'analytics', purpose: 'Counts visits', duration: '2 years' } as const; // prettier-ignore
		const { ui, q, click } = mountUi({ cookies: [cookie] });
		ui.panel({ ...NONE_GRANTED });
		const table = q('#ec-l-analytics')!;
		expect(table.hidden).toBe(true);
		click('[data-l="analytics"]');
		expect(table.hidden).toBe(false);
		expect(q('[data-l="analytics"]')!.getAttribute('aria-expanded')).toBe('true');
		expect(table.textContent).toContain('Counts visits');
	});

	it('Escape closes it and returns focus to the button that opened it', () => {
		const { ui, q, root } = mountUi();
		ui.banner('full');
		q('[data-a="choose"]')!.focus();
		ui.panel({ ...NONE_GRANTED });
		q('.dl')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		expect(q('.dl')).toBeNull();
		expect(q('.ov')).toBeNull();
		expect(root.activeElement).toBe(q('[data-a="choose"]'));
	});

	it('closes when the backdrop is clicked; reject and accept call their handlers', () => {
		const { ui, h, q, click } = mountUi();
		ui.panel({ ...NONE_GRANTED });
		click('.df [data-a="reject"]');
		click('.df [data-a="accept"]');
		expect(h.rejectAll).toHaveBeenCalledOnce();
		expect(h.acceptAll).toHaveBeenCalledOnce();
		click('.ov');
		expect(q('.dl')).toBeNull();
	});
});

describe('floating button, toast and teardown', () => {
	it('the cookie button reopens preferences and can be removed', () => {
		const { ui, h, q, click } = mountUi();
		ui.floating(true);
		expect(q('.fb')!.getAttribute('aria-label')).toBe(texts.reopen);
		click('.fb');
		expect(h.openPreferences).toHaveBeenCalledOnce();
		ui.floating(false);
		expect(q('.fb')).toBeNull();
	});

	it('the toast is a status message that goes away on its own', () => {
		vi.useFakeTimers();
		const { ui, q } = mountUi();
		ui.toast('Saved');
		expect(q('.ts')!.getAttribute('role')).toBe('status');
		expect(q('.ts')!.textContent).toBe('Saved');
		vi.advanceTimersByTime(3000);
		expect(q('.ts')).toBeNull();
	});

	it('destroy removes everything from the page', () => {
		const { ui } = mountUi();
		ui.banner('full');
		ui.destroy();
		expect(document.querySelector('we-love-cookies')).toBeNull();
	});
});

describe('manager with the real UI', () => {
	it('opt-in shows the banner; Accept all saves the cookie, hides it and confirms', () => {
		const m = createConsent({ mode: 'opt-in', rev: 1, floatingButton: true });
		const root = document.querySelector('we-love-cookies')!.shadowRoot!;
		expect(root.querySelector('#ec-t')!.textContent).toBe(texts.title);
		root.querySelector<HTMLElement>('[data-a="accept"]')!.click();
		const c = decodeConsent(readCookie(document.cookie, 'wlc_consent'));
		expect(c).toMatchObject({ action: 'accept_all', grants: { analytics: true, marketing: true } });
		expect(root.querySelector('section.bn')).toBeNull();
		expect(root.querySelector('.ts')!.textContent).toBe(texts.saved);
		m.destroy();
		expect(document.querySelector('we-love-cookies')).toBeNull();
	});

	it('the panel saves a custom choice through the manager', () => {
		const m = createConsent({ mode: 'opt-in', rev: 1 });
		const root = document.querySelector('we-love-cookies')!.shadowRoot!;
		root.querySelector<HTMLElement>('[data-a="choose"]')!.click();
		root.querySelector<HTMLElement>('[data-c="analytics"]')!.click();
		root.querySelector<HTMLElement>('[data-a="save"]')!.click();
		expect(m.get().grants).toMatchObject({ analytics: true, marketing: false });
		expect(root.querySelector('.dl')).toBeNull();
		m.destroy();
	});
});
