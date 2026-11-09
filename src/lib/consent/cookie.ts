/**
 * The consent cookie wire format (readable by the browser and the server). Framework-free.
 * `1.<id>.<at base36>.<rev>.<mode code>.<p a m bits>.<action code>`, e.g. `1.k3J9x_aB2cD4eF6g.mfx2k1a0.1.i.011.c`.
 * Values are re-validated on read; anything malformed reads as "no choice".
 */
import {
	CONSENT_ACTIONS,
	CONSENT_MODES,
	type ConsentAction,
	type ConsentMode,
	type StoredConsent
} from './types.ts';

const MODE_CODE: Record<ConsentMode, string> = {
	'opt-in': 'i',
	'opt-in-uk': 'u',
	'opt-in-light': 'l',
	'opt-out-gpc': 'g',
	'opt-out': 'o',
	notice: 'n'
};
const ACTION_CODE: Record<ConsentAction, string> = {
	accept_all: 'a',
	reject_all: 'r',
	custom: 'c',
	acknowledge: 'k',
	withdraw: 'w',
	gpc: 'g'
};
const invert = <K extends string>(m: Record<K, string>) =>
	Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<string, K>;
const MODE_OF = invert(MODE_CODE);
const ACTION_OF = invert(ACTION_CODE);

export const CONSENT_ID_RE = /^[A-Za-z0-9_-]{16}$/;

/** 16 url-safe random characters (96 bits). */
export function newConsentId(): string {
	const bytes = new Uint8Array(12);
	crypto.getRandomValues(bytes);
	let s = '';
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_');
}

export function encodeConsent(c: StoredConsent): string {
	const bits = `${+c.grants.preferences}${+c.grants.analytics}${+c.grants.marketing}`;
	return [
		'1',
		c.id,
		Math.max(0, Math.floor(c.at)).toString(36),
		String(Math.max(0, Math.floor(c.rev))),
		MODE_CODE[c.mode],
		bits,
		ACTION_CODE[c.action]
	].join('.');
}

export function decodeConsent(raw: string | null | undefined): StoredConsent | null {
	if (!raw || raw.length > 80) return null;
	const p = decodeURIComponent(raw).split('.');
	if (p.length !== 7 || p[0] !== '1') return null;
	const [, id, at36, rev, m, bits, a] = p;
	if (!CONSENT_ID_RE.test(id) || !/^[0-9a-z]{1,12}$/.test(at36) || !/^\d{1,6}$/.test(rev))
		return null;
	if (!/^[01]{3}$/.test(bits) || !MODE_OF[m] || !ACTION_OF[a]) return null;
	const at = parseInt(at36, 36);
	if (!Number.isFinite(at)) return null;
	return {
		id,
		at,
		rev: Number(rev),
		mode: MODE_OF[m],
		action: ACTION_OF[a],
		grants: { preferences: bits[0] === '1', analytics: bits[1] === '1', marketing: bits[2] === '1' }
	};
}

/** Read a cookie value from a `document.cookie` style string. */
export function readCookie(cookieHeader: string, name: string): string | null {
	for (const part of cookieHeader.split(';')) {
		const i = part.indexOf('=');
		if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
	}
	return null;
}

export const isConsentMode = (v: unknown): v is ConsentMode =>
	typeof v === 'string' && (CONSENT_MODES as readonly string[]).includes(v);
export const isConsentAction = (v: unknown): v is ConsentAction =>
	typeof v === 'string' && (CONSENT_ACTIONS as readonly string[]).includes(v);

/** Every value of a cookie (a host-only and a domain copy can both exist). */
export function readCookies(cookieHeader: string, name: string): string[] {
	const out: string[] = [];
	for (const part of cookieHeader.split(';')) {
		const i = part.indexOf('=');
		if (i > 0 && part.slice(0, i).trim() === name) out.push(part.slice(i + 1).trim());
	}
	return out;
}

/** The newest valid choice among several copies (highest time), or null. */
export function newestConsent(values: readonly string[]): StoredConsent | null {
	let best: StoredConsent | null = null;
	for (const v of values) {
		const c = decodeConsent(v);
		if (c && (!best || c.at > best.at)) best = c;
	}
	return best;
}
