/** How long the cookie reopen button stays after it appears. */
export const FAB_HIDE_MS = 5000;
/** Scrolling less than this (in px) does not count, so layout jitter cannot hide the button. */
const SCROLL_PX = 24;
const SEARCH = 'input[type="search"], [role="search"] input, input[name="q"]';

type Win = Pick<
	Window,
	'addEventListener' | 'removeEventListener' | 'setTimeout' | 'clearTimeout' | 'scrollY'
>;

/** Calls `hide` once: after `delay`, on the first real page scroll, or when a search box is used. */
export function autoHide(win: Win, hide: () => void, delay = FAB_HIDE_MS): () => void {
	const startY = win.scrollY;
	let done = false;
	const fire = () => {
		if (done) return;
		stop();
		hide();
	};
	const onScroll = () => {
		if (Math.abs(win.scrollY - startY) >= SCROLL_PX) fire();
	};
	const onSearch = (e: Event) => {
		const t = e.target as Element | null;
		if (t && typeof t.matches === 'function' && t.matches(SEARCH)) fire();
	};
	const timer = win.setTimeout(fire, delay);
	// Window-level, not capture: only the page's own scroll reaches here, never a carousel's.
	win.addEventListener('scroll', onScroll, { passive: true });
	win.addEventListener('focusin', onSearch, true);
	win.addEventListener('input', onSearch, true);
	function stop() {
		done = true;
		win.clearTimeout(timer);
		win.removeEventListener('scroll', onScroll);
		win.removeEventListener('focusin', onSearch, true);
		win.removeEventListener('input', onSearch, true);
	}
	return stop;
}
