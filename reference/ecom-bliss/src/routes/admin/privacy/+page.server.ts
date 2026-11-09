import { countOpenRequests } from '#lib/server/privacy/requests.ts';
import { error, fail } from '@sveltejs/kit';
import { rejectAdminWrite } from '#lib/admin/server/admin-write.ts';
import {
	BANNER_LANGUAGES,
	EDITABLE_TEXTS,
	PRIVACY_PERIODS,
	PRIVACY_TABS,
	type PrivacyTab
} from '#lib/admin/privacy/display.ts';
import { readOverview, readRecords } from '#lib/admin/privacy/records.ts';
import { getSetting } from '#lib/server/settings.ts';
import { listSites, websiteLabel } from '#lib/server/consent/sites.ts';
import { purgeOldConsent, RETENTION_YEARS } from '#lib/server/consent/log.ts';
import {
	DEFAULT_COOKIES,
	getConsentSettings,
	saveConsentSettings,
	withCookieLabels,
	type ConsentSettings
} from '#lib/server/consent/settings.ts';
import { CONSENT_ID_RE } from '#lib/consent/cookie.ts';
import { BANNER_POSITIONS, CONSENT_CATEGORIES, type CookieInfo } from '#lib/consent/types.ts';
import type { Actions, PageServerLoad } from './$types';

const LANGS = new Set(BANNER_LANGUAGES.map((l) => l.code));

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
	if (!locals.adminId) error(401, 'Sign in to view privacy settings.');
	setHeaders({ 'cache-control': 'private, no-store' });
	const raw = url.searchParams.get('tab');
	const tab: PrivacyTab = (PRIVACY_TABS as readonly string[]).includes(raw ?? '')
		? (raw as PrivacyTab)
		: 'overview';
	const daysRaw = Number(url.searchParams.get('days'));
	const days = (PRIVACY_PERIODS as readonly number[]).includes(daysRaw) ? daysRaw : 30;
	const langRaw = (url.searchParams.get('lang') ?? 'en').toLowerCase();
	const lang = LANGS.has(langRaw) ? langRaw : 'en';
	const lookupRaw = (url.searchParams.get('id') ?? '').trim();
	const lookup = lookupRaw ? lookupRaw : null;
	const settings = await getConsentSettings();
	if (tab === 'records') await purgeOldConsent().catch(() => {});
	const [sites, storeLogo, storeName] = await Promise.all([
		listSites(),
		getSetting<string | null>('store.logoUrl', null),
		getSetting<string | null>('store.name', null)
	]);
	const siteRaw = url.searchParams.get('site') ?? '';
	const site = sites.some((x) => x.id === siteRaw) ? siteRaw : '';
	const names = new Map(sites.map((x) => [x.id, x.name]));
	const records =
		tab === 'records'
			? await readRecords(lookup && CONSENT_ID_RE.test(lookup) ? lookup : null)
			: [];
	return {
		openRequests: await countOpenRequests().catch(() => 0),
		tab,
		days,
		lang,
		// Show the default plain-words names for rows saved before labels existed.
		settings: { ...settings, cookies: withCookieLabels(settings.cookies) },
		overview: tab === 'overview' ? await readOverview(days, Date.now(), site) : null,
		site,
		websites: sites.map((x) => ({ key: x.id, name: x.name })),
		hasLogo: !!storeLogo,
		lookup,
		lookupValid: lookup ? CONSENT_ID_RE.test(lookup) : true,
		records: records.map((r) => ({
			...r,
			website: websiteLabel(r.site, names, storeName || 'This store')
		})),
		retentionYears: RETENTION_YEARS
	};
};

const on = (f: FormData, k: string) => f.get(k) === 'on' || f.get(k) === 'true';
const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

async function save(next: ConsentSettings, askAgain = false, message = 'Saved.') {
	const res = await saveConsentSettings(next, { askAgain });
	if (!res.ok) return fail(400, { error: res.error });
	return { success: message, rev: res.settings.rev };
}

export const actions: Actions = {
	banner: async (event) => {
		const rejected = rejectAdminWrite(event);
		if (rejected) return rejected;
		const f = await event.request.formData();
		const prev = await getConsentSettings();
		const position = text(f, 'position');
		const lang = text(f, 'lang');
		const texts = structuredClone(prev.texts);
		if (LANGS.has(lang)) {
			const own: Record<string, string> = { ...(texts[lang] as Record<string, string>) };
			for (const { key } of EDITABLE_TEXTS) {
				const v = text(f, `text_${key}`);
				if (v) own[key] = v;
				else delete own[key];
			}
			if (Object.keys(own).length) texts[lang] = own;
			else delete texts[lang];
		}
		const theme = on(f, 'storeTheme')
			? {}
			: {
					bg: text(f, 'theme_bg'),
					fg: text(f, 'theme_fg'),
					primary: text(f, 'theme_primary'),
					primaryFg: text(f, 'theme_primaryFg')
				};
		const next: ConsentSettings = {
			...prev,
			enabled: on(f, 'enabled'),
			position: (BANNER_POSITIONS as readonly string[]).includes(position)
				? (position as ConsentSettings['position'])
				: prev.position,
			floatingButton: on(f, 'floatingButton'),
			showLogo: on(f, 'showLogo'),
			preferencesCategory: on(f, 'preferencesCategory'),
			noticeBanner: { optOut: on(f, 'noticeOptOut'), notice: on(f, 'noticeNotice') },
			theme: Object.fromEntries(Object.entries(theme).filter(([, v]) => v)),
			texts
		};
		return save(next);
	},
	askAgain: async (event) => {
		const rejected = rejectAdminWrite(event);
		if (rejected) return rejected;
		return save(
			await getConsentSettings(),
			true,
			'Done. Every visitor will see the banner again on their next visit.'
		);
	},
	cookies: async (event) => {
		const rejected = rejectAdminWrite(event);
		if (rejected) return rejected;
		const f = await event.request.formData();
		const rows: CookieInfo[] = [];
		for (let i = 0; i < 200; i++) {
			if (!f.has(`name_${i}`)) break;
			if (on(f, `remove_${i}`)) continue;
			const row = {
				name: text(f, `name_${i}`),
				label: text(f, `label_${i}`) || undefined,
				provider: text(f, `provider_${i}`),
				category: text(f, `category_${i}`),
				purpose: text(f, `purpose_${i}`),
				duration: text(f, `duration_${i}`)
			};
			if (!row.name && !row.purpose) continue; // the empty "add" row
			if (!(CONSENT_CATEGORIES as readonly string[]).includes(row.category))
				return fail(400, { error: `Pick a category for ${row.name || 'the new cookie'}.` });
			if (!row.name || !row.provider || !row.purpose || !row.duration)
				return fail(400, {
					error: `Fill in name, provider, purpose and how long it lasts for ${row.name || 'the new cookie'}.`
				});
			rows.push(row as CookieInfo);
		}
		return save({ ...(await getConsentSettings()), cookies: rows });
	},
	resetCookies: async (event) => {
		const rejected = rejectAdminWrite(event);
		if (rejected) return rejected;
		return save({ ...(await getConsentSettings()), cookies: structuredClone(DEFAULT_COOKIES) });
	}
};
