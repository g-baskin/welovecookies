/** We Love Cookies admin: plain-words labels and the overview numbers (pure, no database). */
import { MODE_RULES } from '#lib/consent/regions.ts';
import { DEVICES, type ConsentMode, type Device } from '#lib/consent/types.ts';

export const PRIVACY_TABS = ['overview', 'banner', 'cookies', 'records'] as const;
export type PrivacyTab = (typeof PRIVACY_TABS)[number];
export const PRIVACY_PERIODS = [7, 30, 90] as const;

/** Banner languages offered for wording overrides (built-in translations exist for all). */
export const BANNER_LANGUAGES: { code: string; name: string }[] = [
	{ code: 'en', name: 'English' },
	{ code: 'de', name: 'German' },
	{ code: 'fr', name: 'French' },
	{ code: 'es', name: 'Spanish' },
	{ code: 'it', name: 'Italian' },
	{ code: 'pt', name: 'Portuguese' },
	{ code: 'nl', name: 'Dutch' },
	{ code: 'pl', name: 'Polish' },
	{ code: 'sv', name: 'Swedish' },
	{ code: 'da', name: 'Danish' },
	{ code: 'fi', name: 'Finnish' },
	{ code: 'nb', name: 'Norwegian' },
	{ code: 'cs', name: 'Czech' },
	{ code: 'ro', name: 'Romanian' },
	{ code: 'el', name: 'Greek' },
	{ code: 'tr', name: 'Turkish' },
	{ code: 'ja', name: 'Japanese' },
	{ code: 'ko', name: 'Korean' },
	{ code: 'zh', name: 'Chinese' },
	{ code: 'ar', name: 'Arabic' }
];

/** Banner wording the owner can edit here (the rest keeps the built-in text). */
export const EDITABLE_TEXTS = [
	{ key: 'title', label: 'Heading', long: false },
	{ key: 'body', label: 'Message where visitors must agree first (EU, UK, Brazil…)', long: true },
	{
		key: 'noticeBody',
		label: 'Message where visitors can opt out (most US states, Canada…)',
		long: true
	},
	{ key: 'acceptAll', label: '“Accept all” button', long: false },
	{ key: 'rejectAll', label: '“Reject all” button', long: false },
	{ key: 'customize', label: '“Choose” button', long: false },
	{ key: 'acknowledge', label: '“OK” button', long: false },
	{ key: 'reopen', label: '“Cookie settings” link', long: false }
] as const;
export type EditableTextKey = (typeof EDITABLE_TEXTS)[number]['key'];

export const REGION_GROUPS = [
	{
		key: 'ask',
		label: 'Asks first',
		hint: 'EU, UK, Brazil and others: nothing optional runs until the visitor agrees.'
	},
	{
		key: 'optout',
		label: 'Lets people opt out',
		hint: 'Most US privacy states and Canada: on by default, with a clear way to say no.'
	},
	{
		key: 'notice',
		label: 'Notice only',
		hint: 'Places without a cookie law: we just let people know.'
	}
] as const;
export type RegionGroup = (typeof REGION_GROUPS)[number]['key'];

export const groupOf = (mode: string): RegionGroup =>
	mode in MODE_RULES
		? MODE_RULES[mode as ConsentMode].optIn
			? 'ask'
			: mode === 'notice'
				? 'notice'
				: 'optout'
		: 'ask';

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
	'opt-out-gpc': 'Can opt out (browser signal respected by law)',
	'opt-out': 'Can opt out',
	notice: 'Notice only'
};

export interface DailyRow {
	metric: string;
	mode: string;
	country: string;
	device: string;
	n: number;
}

export interface Tally {
	seen: number;
	answered: number;
	acceptAll: number;
	rejectAll: number;
	custom: number;
}
const empty = (): Tally => ({ seen: 0, answered: 0, acceptAll: 0, rejectAll: 0, custom: 0 });

function add(t: Tally, r: DailyRow) {
	if (r.metric === 'seen') t.seen += r.n;
	else if (r.metric === 'accept_all') {
		t.acceptAll += r.n;
		t.answered += r.n;
	} else if (r.metric === 'reject_all') {
		t.rejectAll += r.n;
		t.answered += r.n;
	} else if (r.metric === 'custom') {
		t.custom += r.n;
		t.answered += r.n;
	} else if (r.metric === 'acknowledge') t.answered += r.n;
}

function slot<K>(m: Map<K, Tally>, k: K): Tally {
	const found = m.get(k);
	if (found) return found;
	const t = empty();
	m.set(k, t);
	return t;
}

export interface Overview {
	total: Tally;
	/** Share of answered banner choices that allowed analytics or marketing (from the log). */
	optIn: { allowed: number; of: number };
	byRegion: { key: RegionGroup; label: string; hint: string; tally: Tally }[];
	byDevice: { key: Device; tally: Tally }[];
	topCountries: { country: string; tally: Tally }[];
}

export function summarize(rows: DailyRow[], optIn: { allowed: number; of: number }): Overview {
	const total = empty();
	const region = new Map<RegionGroup, Tally>();
	const device = new Map<string, Tally>();
	const country = new Map<string, Tally>();
	for (const r of rows) {
		add(total, r);
		const g = groupOf(r.mode);
		add(slot(region, g), r);
		add(slot(device, r.device), r);
		add(slot(country, r.country || ''), r);
	}
	return {
		total,
		optIn,
		byRegion: REGION_GROUPS.map((g) => ({ ...g, tally: region.get(g.key) ?? empty() })),
		byDevice: DEVICES.map((key) => ({ key, tally: device.get(key) ?? empty() })),
		topCountries: [...country.entries()]
			.map(([c, tally]) => ({ country: c, tally }))
			.sort(
				(a, b) =>
					b.tally.seen + b.tally.answered - (a.tally.seen + a.tally.answered) ||
					a.country.localeCompare(b.country)
			)
			.slice(0, 10)
	};
}

export const pct = (part: number, whole: number) =>
	whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–';

// ---- Plain names for everything a person reads (never codes or field names) ----

const US_STATES: Record<string, string> = {
	AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
	CT: 'Connecticut', DE: 'Delaware', DC: 'Washington, D.C.', FL: 'Florida', GA: 'Georgia',
	HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
	KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
	MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
	NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
	NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
	OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
	TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
	WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
}; // prettier-ignore
const CA_PROVINCES: Record<string, string> = {
	AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
	NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories', NU: 'Nunavut',
	ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec', SK: 'Saskatchewan', YT: 'Yukon'
}; // prettier-ignore

let regionNames: Intl.DisplayNames | null = null;
let languageNames: Intl.DisplayNames | null = null;

/** "Germany" for "DE"; "Unknown" when the country could not be told. */
export function countryName(code: string | null | undefined): string {
	const c = (code ?? '').trim().toUpperCase();
	if (!/^[A-Z]{2}$/.test(c) || c === 'XX' || c === 'T1') return 'Unknown';
	try {
		regionNames ??= new Intl.DisplayNames(['en'], { type: 'region' });
		return regionNames.of(c) ?? 'Unknown';
	} catch {
		return 'Unknown';
	}
}

/** "California, United States" / "Quebec, Canada" / "Germany". */
export function placeName(country: string | null | undefined, region?: string | null): string {
	const name = countryName(country);
	const r = (region ?? '').toUpperCase();
	const c = (country ?? '').toUpperCase();
	const sub = c === 'US' ? US_STATES[r] : c === 'CA' ? CA_PROVINCES[r] : undefined;
	return sub ? `${sub}, ${name}` : name;
}

/** "German" for "de". */
export function languageName(code: string | null | undefined): string {
	const c = (code ?? '').trim();
	const known = BANNER_LANGUAGES.find((l) => l.code === c);
	if (known) return known.name;
	if (!c) return 'Unknown';
	try {
		languageNames ??= new Intl.DisplayNames(['en'], { type: 'language' });
		return languageNames.of(c) ?? 'Unknown';
	} catch {
		return 'Unknown';
	}
}

export const DEVICE_NAME: Record<string, string> = {
	phone: 'Phone',
	tablet: 'Tablet',
	desktop: 'Computer'
};

/** "Safari on iPhone", "Chrome on Windows"… from a browser's self-description. */
export function browserName(userAgent: string | null | undefined): string {
	const ua = userAgent ?? '';
	if (!ua) return 'Unknown';
	const browser = /Edg\//.test(ua)
		? 'Edge'
		: /OPR\/|Opera/.test(ua)
			? 'Opera'
			: /SamsungBrowser/.test(ua)
				? 'Samsung Internet'
				: /Firefox\/|FxiOS/.test(ua)
					? 'Firefox'
					: /Chrome\/|CriOS/.test(ua)
						? 'Chrome'
						: /Safari\//.test(ua)
							? 'Safari'
							: 'Another browser';
	const system = /iPhone/.test(ua)
		? 'iPhone'
		: /iPad/.test(ua)
			? 'iPad'
			: /Android/.test(ua)
				? 'Android'
				: /Windows/.test(ua)
					? 'Windows'
					: /Mac OS X|Macintosh/.test(ua)
						? 'Mac'
						: /Linux|CrOS/.test(ua)
							? 'Linux or Chromebook'
							: '';
	return system ? `${browser} on ${system}` : browser;
}

export const yesNo = (v: unknown) => (v ? 'Yes' : 'No');
