// Plain-words labels for the admin pages and the CSV export.
import { MODE_RULES } from '../../src/lib/consent/regions.ts';
import type { ConsentMode } from '../../src/lib/consent/types.ts';

export const ACTION_LABEL: Record<string, string> = {
	accept_all: 'Accepted all',
	reject_all: 'Rejected all',
	custom: 'Chose some',
	acknowledge: 'Said OK',
	withdraw: 'Withdrew',
	gpc: 'Opted out by browser privacy signal'
};
export const MODE_LABEL: Record<string, string> = {
	'opt-in': 'Asks first',
	'opt-in-uk': 'Asks first (UK)',
	'opt-in-light': 'Asks first (lighter rules)',
	'opt-out-gpc': 'Can opt out (browser signal required by law)',
	'opt-out': 'Can opt out',
	notice: 'Notice only'
};
export const DEVICE_LABEL: Record<string, string> = { phone: 'Phone', tablet: 'Tablet', desktop: 'Computer' };
export const CATEGORY_LABEL: Record<string, string> = {
	necessary: 'Necessary',
	preferences: 'Preferences',
	analytics: 'Statistics',
	marketing: 'Marketing'
};

export const REGION_GROUPS = [
	{ key: 'ask', label: 'Asks first', hint: 'EU, UK, Brazil and others: nothing optional runs until the visitor agrees.' },
	{ key: 'optout', label: 'Lets people opt out', hint: 'Most US privacy states and Canada: on by default, with a clear way to say no.' },
	{ key: 'notice', label: 'Notice only', hint: 'Places without a cookie law: visitors are just told.' }
] as const;
export type RegionGroup = (typeof REGION_GROUPS)[number]['key'];
export const groupOf = (mode: string): RegionGroup =>
	!(mode in MODE_RULES) || MODE_RULES[mode as ConsentMode].optIn ? 'ask' : mode === 'notice' ? 'notice' : 'optout';

export const yesNo = (v: unknown) => (v ? 'Yes' : 'No');

export function placeName(country: string | null, region: string | null): string {
	if (!country) return 'Unknown';
	let name = country;
	try {
		name = new Intl.DisplayNames(['en'], { type: 'region' }).of(country) ?? country;
	} catch {
		/* keep the code */
	}
	return region ? `${name} (${region})` : name;
}

export function browserName(ua: string): string {
	if (/Edg\//.test(ua)) return 'Edge';
	if (/OPR\/|Opera/.test(ua)) return 'Opera';
	if (/Firefox\//.test(ua)) return 'Firefox';
	if (/Chrome\//.test(ua)) return 'Chrome';
	if (/Safari\//.test(ua)) return 'Safari';
	return ua ? 'Other' : 'Unknown';
}

export const utc = (ms: number) => new Date(ms).toISOString().replace('T', ' ').slice(0, 16);
export const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : '–');
