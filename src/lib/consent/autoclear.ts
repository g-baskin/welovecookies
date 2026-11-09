/**
 * Auto-clear: when a category is off, delete that category's known cookies and storage keys.
 * The technical names below live in code only; they are never shown to people.
 * Pure helpers (matching, domains) are exported for tests; `clearOff` does the DOM work.
 */
import { OPTIONAL_CATEGORIES, type Grants, type OptionalCategory } from './types.ts';

/** Known cookie/storage names per category. A trailing * means "starts with". */
export const AUTO_CLEAR: Record<OptionalCategory, readonly string[]> = {
	preferences: [],
	analytics: [
		'_ga', '_ga_*', '_gid', '_gat*', // Google Analytics
		'ph_*', // PostHog
		'_clck', '_clsk', // Microsoft Clarity
		'_hj*', // Hotjar
		'_pk_*', // Matomo
		'mp_*', // Mixpanel
		'ajs_*' // Segment
	],
	marketing: [
		'_fbp', '_fbc', // Meta
		'_ttp', '_tt_*', 'ttcsid*', // TikTok
		'_gcl_*', // Google Ads
		'_uetsid', '_uetvid', // Microsoft Ads
		'_pin_unauth', '_epik', // Pinterest
		'_scid*', // Snap
		'_rdt_uuid', // Reddit
		'li_fat_id', '_li_ss' // LinkedIn
	]
}; // prettier-ignore

/** True when `name` matches one pattern (exact, or prefix when the pattern ends with *). */
export function matchesPattern(name: string, patterns: readonly string[]): boolean {
	return patterns.some((p) => (p.endsWith('*') ? name.startsWith(p.slice(0, -1)) : name === p));
}

/** Categories that are off in these grants (these get cleared). */
export function offCategories(grants: Grants): OptionalCategory[] {
	return OPTIONAL_CATEGORIES.filter((c) => !grants[c]);
}

/** The patterns to clear for these grants: built-in plus the owner's extras. */
export function patternsFor(
	grants: Grants,
	extra: Partial<Record<OptionalCategory, string[]>> = {}
): string[] {
	return offCategories(grants).flatMap((c) => [...AUTO_CLEAR[c], ...(extra[c] ?? [])]);
}

/** Names from a `document.cookie` string that match, never the choice cookie. */
export function namesToClear(
	cookieHeader: string,
	patterns: readonly string[],
	keep: string
): string[] {
	const out = new Set<string>();
	for (const part of cookieHeader.split(';')) {
		const i = part.indexOf('=');
		const n = (i < 0 ? part : part.slice(0, i)).trim();
		if (n && n !== keep && matchesPattern(n, patterns)) out.add(n);
	}
	return [...out].sort();
}

/** localhost, *.localhost, IPv4 and IPv6 hosts only get host-only cookies. */
export function isLocalOrIp(hostname: string): boolean {
	const h = hostname.toLowerCase();
	return (
		!h.includes('.') ||
		h === 'localhost' ||
		h.endsWith('.localhost') ||
		/^\d{1,3}(\.\d{1,3}){3}$/.test(h) ||
		h.includes(':') ||
		h.startsWith('[')
	);
}

/**
 * Root-domain candidates, shortest first: blog.example.co.uk -> co.uk, example.co.uk,
 * blog.example.co.uk. Browsers refuse public suffixes, so the first that sticks is the root.
 */
export function rootCandidates(hostname: string): string[] {
	if (isLocalOrIp(hostname)) return [];
	const p = hostname.toLowerCase().replace(/\.$/, '').split('.');
	const out: string[] = [];
	for (let i = p.length - 2; i >= 0; i--) out.push(p.slice(i).join('.'));
	return out;
}

/** Every `document.cookie` assignment that deletes `name` for these paths and domains. */
export function deletionStrings(name: string, hostname: string, path: string): string[] {
	const paths = [...new Set(['/', path || '/'])];
	const doms = rootCandidates(hostname).flatMap((d) => [d, `.${d}`]);
	const out: string[] = [];
	for (const p of paths) {
		const base = `${name}=; path=${p}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
		out.push(base);
		for (const d of doms) out.push(`${base}; domain=${d}`);
	}
	return out;
}

type StorageLike = Pick<Storage, 'length' | 'key' | 'removeItem'>;
export interface ClearTarget {
	document: { cookie: string };
	location?: { pathname?: string; hostname?: string };
	localStorage?: StorageLike;
	sessionStorage?: StorageLike;
}

/** Delete every listed cookie and storage key for the categories that are off. */
export function clearOff(
	w: ClearTarget,
	grants: Grants,
	extra: Partial<Record<OptionalCategory, string[]>> | undefined,
	keep: string
): string[] {
	const patterns = patternsFor(grants, extra);
	if (!patterns.length) return [];
	const names = namesToClear(w.document.cookie ?? '', patterns, keep);
	const host = w.location?.hostname ?? '';
	const path = w.location?.pathname ?? '/';
	for (const n of names) for (const s of deletionStrings(n, host, path)) w.document.cookie = s;
	for (const k of ['localStorage', 'sessionStorage'] as const) {
		try {
			const s = w[k];
			if (!s) continue;
			const keys: string[] = [];
			for (let i = 0; i < s.length; i++) {
				const key = s.key(i);
				if (key && key !== keep && matchesPattern(key, patterns)) keys.push(key);
			}
			for (const key of keys) s.removeItem(key);
		} catch {
			/* storage blocked */
		}
	}
	return names;
}
