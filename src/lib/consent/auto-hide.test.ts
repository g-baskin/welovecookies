import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { autoHide, FAB_HIDE_MS } from './auto-hide.ts';

function fakeWin() {
	const t = new EventTarget();
	return Object.assign(t, {
		scrollY: 0,
		setTimeout: (f: () => void, ms: number) => setTimeout(f, ms),
		clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id)
	}) as unknown as Window & { scrollY: number };
}
const target = (selector: string) => ({ matches: (s: string) => s.split(', ').includes(selector) });
function fire(win: EventTarget, type: string, t?: unknown) {
	const e = new Event(type);
	if (t) Object.defineProperty(e, 'target', { value: t });
	win.dispatchEvent(e);
}

describe('cookie button auto-hide', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('hides once, 5 seconds after it appears', () => {
		const win = fakeWin();
		const hide = vi.fn();
		autoHide(win, hide);
		vi.advanceTimersByTime(FAB_HIDE_MS - 1);
		expect(hide).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		vi.advanceTimersByTime(FAB_HIDE_MS);
		expect(hide).toHaveBeenCalledOnce();
	});

	it('hides as soon as the visitor scrolls the page, ignoring tiny jitter', () => {
		const win = fakeWin();
		const hide = vi.fn();
		autoHide(win, hide);
		win.scrollY = 10;
		fire(win, 'scroll');
		expect(hide).not.toHaveBeenCalled();
		win.scrollY = 40;
		fire(win, 'scroll');
		expect(hide).toHaveBeenCalledOnce();
		vi.advanceTimersByTime(FAB_HIDE_MS);
		expect(hide).toHaveBeenCalledOnce();
	});

	it('hides when a search box gets focus or typing, not for other fields', () => {
		const win = fakeWin();
		const hide = vi.fn();
		autoHide(win, hide);
		fire(win, 'focusin', target('input[type="email"]'));
		expect(hide).not.toHaveBeenCalled();
		fire(win, 'focusin', target('input[type="search"]'));
		expect(hide).toHaveBeenCalledOnce();

		const hide2 = vi.fn();
		const w2 = fakeWin();
		autoHide(w2, hide2);
		fire(w2, 'input', target('input[name="q"]'));
		expect(hide2).toHaveBeenCalledOnce();
	});

	it('stop() cancels the timer and listeners', () => {
		const win = fakeWin();
		const hide = vi.fn();
		const stop = autoHide(win, hide);
		stop();
		win.scrollY = 500;
		fire(win, 'scroll');
		vi.advanceTimersByTime(FAB_HIDE_MS * 2);
		expect(hide).not.toHaveBeenCalled();
	});
});
