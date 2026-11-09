/**
 * Vanilla DOM renderer in a Shadow DOM host. Non-modal banner (role=region), modal preferences
 * panel (focus trap, Esc, focus return), floating reopen button, toast. No framework.
 */
import { COOKIE_SVG, CSS, SWITCH_KNOB } from './ui-css.ts';
import { autoHide } from './auto-hide.ts';
import {
	OPTIONAL_CATEGORIES,
	type ConsentCategory,
	type ConsentConfig,
	type ConsentTexts,
	type ConsentTheme,
	type Grants
} from './types.ts';

export interface UiState {
	texts: ConsentTexts;
	lang: string;
	rtl: boolean;
	gpc: boolean;
	doNotSell: boolean;
	compact: boolean;
}
export interface UiHandlers {
	acceptAll(): void;
	rejectAll(): void;
	acknowledge(): void;
	save(g: Grants): void;
	openPreferences(): void;
}
export interface Ui {
	banner(kind: 'full' | 'notice' | null): void;
	panel(grants: Grants): void;
	closePanel(): void;
	floating(show: boolean): void;
	toast(msg: string): void;
	destroy(): void;
}

const THEME_VARS: Record<keyof ConsentTheme, string> = {
	bg: '--ec-bg', fg: '--ec-fg', muted: '--ec-muted', mutedFg: '--ec-muted-fg', primary: '--ec-primary',
	primaryFg: '--ec-primary-fg', border: '--ec-border', radius: '--ec-radius',
	buttonRadius: '--ec-button-radius', font: '--ec-font'
}; // prettier-ignore

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const safeUrl = (u: string | undefined | null) =>
	u && /^(https?:|\/|#|mailto:)/i.test(u) ? esc(u) : '';
const safeImg = (u: string | undefined | null) =>
	u && /^(https?:|\/[^/]|data:image\/)/i.test(u) ? esc(u) : '';

export function createUi(doc: Document, config: ConsentConfig, st: UiState, h: UiHandlers): Ui {
	const host = doc.createElement('we-love-cookies');
	for (const [k, v] of Object.entries(config.theme ?? {}))
		if (v) host.style.setProperty(THEME_VARS[k as keyof ConsentTheme], v);
	const root = host.attachShadow({ mode: 'open' });
	const t = st.texts;
	root.innerHTML = `<style>${CSS}</style><div class="w" lang="${esc(st.lang)}" dir="${st.rtl ? 'rtl' : 'ltr'}"></div>`;
	const wrap = root.querySelector('.w') as HTMLElement;
	doc.body.appendChild(host);

	let bannerEl: HTMLElement | null = null;
	let panelEls: HTMLElement[] = [];
	let fab: HTMLElement | null = null;
	let stopAutoHide: (() => void) | null = null;
	let lastFocus: Element | null = null;
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

	const el = (html: string) => {
		const d = doc.createElement('div');
		d.innerHTML = html.trim();
		return d.firstElementChild as HTMLElement;
	};
	// Store logo (banner and panel header); falls back to the cookie when it fails to load.
	const logoSrc = safeImg(config.logoUrl);
	const brand = config.brandName?.trim() ?? '';
	const logo = (cls: string) =>
		logoSrc
			? `<img class="${cls}" src="${logoSrc}" ${brand ? `alt="${esc(brand)}"` : 'alt="" aria-hidden="true"'} decoding="async">`
			: '';
	const wireLogo = (scope: HTMLElement, fallback: string) =>
		scope.querySelector('img.lg,img.lgs')?.addEventListener('error', (e) => {
			const img = e.currentTarget as HTMLElement;
			if (fallback) img.insertAdjacentHTML('afterend', fallback);
			img.remove();
		});
	// Fades the reopen button out; waits while the pointer or keyboard focus is on it.
	const dissolve = () => {
		const b = fab;
		if (!b) return;
		if (b.matches(':hover') || root.activeElement === b) {
			const later = () => {
				b.removeEventListener('mouseleave', later);
				b.removeEventListener('blur', later);
				if (fab === b) dissolve();
			};
			b.addEventListener('mouseleave', later);
			b.addEventListener('blur', later);
			return;
		}
		fab = null;
		stopAutoHide = null;
		b.classList.add('out');
		b.setAttribute('aria-hidden', 'true');
		b.tabIndex = -1;
		setTimeout(() => b.remove(), 700);
	};
	const links = (notice: boolean) => {
		const l = config.links ?? {};
		const a = (u: string | undefined, label: string) =>
			safeUrl(u) ? `<a href="${safeUrl(u)}">${esc(label)}</a>` : '';
		return `<p class="lk">${a(l.privacyPolicy, t.privacyPolicy)}${a(l.cookiePolicy, t.cookiePolicy)}${notice && st.doNotSell ? a(l.privacyChoices ?? '#', t.doNotSell) : ''}</p>`;
	};

	// Lift above a sticky bottom bar (e.g. [data-sticky-cta]).
	let ro: ResizeObserver | undefined;
	const lift = () => {
		let px = 0;
		const sel = config.avoidSelector;
		if (sel) {
			const view = doc.defaultView;
			for (const n of Array.from(doc.querySelectorAll<HTMLElement>(sel))) {
				const cs = view?.getComputedStyle(n);
				const r = n.getBoundingClientRect();
				if (
					!cs ||
					cs.position !== 'fixed' ||
					cs.display === 'none' ||
					cs.visibility === 'hidden' ||
					r.height === 0
				)
					continue;
				const fromBottom = (view?.innerHeight ?? 0) - r.top;
				if (fromBottom > 0 && fromBottom < 300) px = Math.max(px, Math.round(fromBottom));
			}
		}
		host.style.setProperty('--lift', `${px}px`);
	};
	const view = doc.defaultView;
	if (config.avoidSelector && view) {
		lift();
		view.addEventListener('resize', lift);
		if (typeof ResizeObserver === 'function') {
			ro = new ResizeObserver(lift);
			for (const n of Array.from(doc.querySelectorAll(config.avoidSelector))) ro.observe(n);
			ro.observe(doc.body);
		}
	}

	const ui: Ui = {
		banner(kind) {
			bannerEl?.remove();
			bannerEl = null;
			if (!kind) return;
			const full = kind === 'full';
			bannerEl =
				el(`<section class="bn${st.compact ? ' cp' : ''}" role="region" aria-labelledby="ec-t" data-pos="${esc(config.position ?? 'auto')}">
<div class="hd">${logo('lg') || COOKIE_SVG}<h2 id="ec-t">${esc(t.title)}</h2></div>
<p class="tx">${esc(full ? t.body : t.noticeBody)}</p>${links(!full)}
<div class="bt">${
					full
						? `<button class="b b1" data-a="accept">${esc(t.acceptAll)}</button><button class="b b1" data-a="reject">${esc(t.rejectAll)}</button>`
						: `<button class="b b1 ch" data-a="ok" style="grid-column:span 2">${esc(t.acknowledge)}</button>`
				}<button class="b b2 ch" data-a="choose">${esc(t.customize)}</button></div></section>`);
			wireLogo(bannerEl, COOKIE_SVG);
			bannerEl.addEventListener('click', (e) => {
				const a = (e.target as Element).closest('[data-a]')?.getAttribute('data-a');
				if (a === 'accept') h.acceptAll();
				else if (a === 'reject') h.rejectAll();
				else if (a === 'ok') h.acknowledge();
				else if (a === 'choose') h.openPreferences();
			});
			wrap.appendChild(bannerEl);
		},
		panel(grants) {
			ui.closePanel();
			lastFocus = doc.activeElement === host ? root.activeElement : doc.activeElement;
			const cur: Grants = { ...grants };
			const cats: ConsentCategory[] = [
				'necessary',
				...OPTIONAL_CATEGORIES.filter((c) => c !== 'preferences' || config.preferencesCategory)
			];
			const rows = cats
				.map((c) => {
					const ct = t.categories[c];
					const list = (config.cookies ?? []).filter((k) => k.category === c);
					const locked = c === 'necessary' || (c === 'marketing' && st.gpc);
					const on = c === 'necessary' || cur[c as keyof Grants];
					const ctl =
						c === 'necessary'
							? `<span class="on">${esc(t.alwaysOn)}</span>`
							: `<button class="sw" role="switch" aria-checked="${on}" aria-labelledby="ec-c-${c}" data-c="${c}"${locked ? ' disabled' : ''}>${SWITCH_KNOB}</button>`;
					const table = list.length
						? `<button class="sc" aria-expanded="false" aria-controls="ec-l-${c}" data-l="${c}">${esc(t.showCookies)} (${list.length})</button><table id="ec-l-${c}" hidden><tr><th>${esc(t.cookieTable.name)}</th><th>${esc(t.cookieTable.provider)}</th><th>${esc(t.cookieTable.purpose)}</th><th>${esc(t.cookieTable.duration)}</th></tr>${list.map((k) => `<tr><td>${k.label ? `${esc(k.label)}<span class="cn">${esc(k.name)}</span>` : esc(k.name)}</td><td>${esc(k.provider)}</td><td>${esc(k.purpose)}</td><td>${esc(k.duration)}</td></tr>`).join('')}</table>`
						: '';
					return `<div class="ct"><div class="cr"><h3 id="ec-c-${c}">${esc(ct.title)}</h3>${ctl}</div><p class="cd">${esc(ct.description)}</p>${table}</div>`;
				})
				.join('');
			const ov = el(`<div class="ov"></div>`);
			const dl =
				el(`<div class="dl" role="dialog" aria-modal="true" aria-labelledby="ec-pt" tabindex="-1">
<div class="dh">${logo('lgs')}<h2 id="ec-pt">${esc(t.preferencesTitle)}</h2><button class="x" data-a="close" aria-label="${esc(t.close)}">&times;</button></div>
<div class="db"><p class="in">${esc(t.preferencesIntro)}</p>${st.gpc ? `<p class="gp">${esc(t.gpcHonored)}</p>` : ''}${rows}${links(st.doNotSell)}</div>
<div class="df"><button class="b b1" data-a="reject">${esc(t.rejectAll)}</button><button class="b b1 sv" data-a="save">${esc(t.save)}</button><button class="b b1" data-a="accept">${esc(t.acceptAll)}</button></div></div>`);
			wireLogo(dl, '');
			ov.addEventListener('click', () => ui.closePanel());
			dl.addEventListener('click', (e) => {
				const b = (e.target as Element).closest('button');
				if (!b) return;
				const c = b.getAttribute('data-c') as keyof Grants | null;
				const l = b.getAttribute('data-l');
				const a = b.getAttribute('data-a');
				if (c) {
					cur[c] = !cur[c];
					b.setAttribute('aria-checked', String(cur[c]));
				} else if (l) {
					const tb = dl.querySelector<HTMLElement>(`#ec-l-${l}`);
					const open = b.getAttribute('aria-expanded') !== 'true';
					b.setAttribute('aria-expanded', String(open));
					if (tb) tb.hidden = !open;
					b.textContent = `${open ? t.hideCookies : t.showCookies} (${tb?.querySelectorAll('tr').length ? tb.querySelectorAll('tr').length - 1 : 0})`;
				} else if (a === 'close') ui.closePanel();
				else if (a === 'reject') h.rejectAll();
				else if (a === 'accept') h.acceptAll();
				else if (a === 'save') h.save(st.gpc ? { ...cur, marketing: false } : { ...cur });
			});
			dl.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') {
					e.preventDefault();
					ui.closePanel();
				} else if (e.key === 'Tab') {
					const f = Array.from(
						dl.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]')
					).filter((n) => n.offsetParent !== null);
					const first = f[0];
					const last = f[f.length - 1];
					if (!first || !last) return;
					const act = root.activeElement;
					if (e.shiftKey && (act === first || act === dl)) {
						e.preventDefault();
						last.focus();
					} else if (!e.shiftKey && act === last) {
						e.preventDefault();
						first.focus();
					}
				}
			});
			panelEls = [ov, dl];
			wrap.appendChild(ov);
			wrap.appendChild(dl);
			(dl.querySelector<HTMLElement>('.sw:not([disabled])') ?? dl).focus();
		},
		closePanel() {
			if (!panelEls.length) return;
			for (const n of panelEls) n.remove();
			panelEls = [];
			const back = lastFocus as HTMLElement | null;
			lastFocus = null;
			const target =
				back && back !== host && back.isConnected
					? back
					: fab?.isConnected
						? fab
						: bannerEl?.querySelector('button');
			(target as HTMLElement | null | undefined)?.focus?.();
		},
		floating(show) {
			if (!show) {
				stopAutoHide?.();
				stopAutoHide = null;
				fab?.remove();
				fab = null;
				return;
			}
			if (fab) return;
			fab = el(
				`<button class="fb" aria-label="${esc(t.reopen)}" title="${esc(t.reopen)}">${COOKIE_SVG}</button>`
			);
			fab.addEventListener('click', () => h.openPreferences());
			wrap.appendChild(fab);
			const w = doc.defaultView;
			if (w) stopAutoHide = autoHide(w, dissolve);
		},
		toast(msg) {
			wrap.querySelector('.ts')?.remove();
			const n = el(`<div class="ts" role="status">${esc(msg)}</div>`);
			wrap.appendChild(n);
			clearTimeout(toastTimer);
			toastTimer = setTimeout(() => n.remove(), 2600);
		},
		destroy() {
			stopAutoHide?.();
			clearTimeout(toastTimer);
			ro?.disconnect();
			view?.removeEventListener('resize', lift);
			host.remove();
		}
	};
	return ui;
}
