/**
 * We Love Cookies settings (setting key `consent.settings`) and the banner versions log.
 * Saving wording, categories or cookie purposes bumps `rev` (visitors are asked again) and keeps a
 * snapshot of what was shown in `consent_versions`: proof of what the visitor saw.
 * Built-in translations live in the browser core (src/lib/consent/i18n.ts) and are versioned with
 * the code; the snapshot holds the owner's overrides, the categories shown and the cookie list.
 */
import { z } from 'zod';
import { getDb, schema } from '#lib/server/db/index.ts';
import { getSetting, setSetting } from '#lib/server/settings.ts';
import {
	BANNER_POSITIONS,
	CONSENT_CATEGORIES,
	type ConsentIntegrations,
	type CookieInfo
} from '#lib/consent/types.ts';

export const CONSENT_SETTING = 'consent.settings';

const str = (max: number) => z.string().trim().max(max);
/** A CSS value without anything that could break out of a declaration. */
const cssValue = z
	.string()
	.trim()
	.max(120)
	.regex(/^[^;{}<>\\]*$/, 'Use a plain color or size, e.g. #111827 or 8px.');

const categoryText = z.object({ title: str(80), description: str(600) }).partial();

const textsSchema = z
	.object({
		title: str(200),
		body: str(1000),
		noticeBody: str(1000),
		acceptAll: str(60),
		rejectAll: str(60),
		customize: str(60),
		acknowledge: str(60),
		save: str(60),
		close: str(60),
		preferencesTitle: str(200),
		preferencesIntro: str(1000),
		alwaysOn: str(60),
		categories: z
			.object({
				necessary: categoryText,
				preferences: categoryText,
				analytics: categoryText,
				marketing: categoryText
			})
			.partial(),
		showCookies: str(60),
		hideCookies: str(60),
		cookieTable: z
			.object({ name: str(40), provider: str(40), purpose: str(40), duration: str(40) })
			.partial(),
		privacyPolicy: str(80),
		cookiePolicy: str(80),
		reopen: str(60),
		doNotSell: str(120),
		gpcHonored: str(200),
		saved: str(200)
	})
	.partial();

export const cookieInfoSchema = z.object({
	name: str(80).min(1),
	label: str(80).optional(),
	provider: str(80).min(1),
	category: z.enum(CONSENT_CATEGORIES),
	purpose: str(300).min(1),
	duration: str(40).min(1)
});

const themeSchema = z
	.object({
		bg: cssValue,
		fg: cssValue,
		muted: cssValue,
		mutedFg: cssValue,
		primary: cssValue,
		primaryFg: cssValue,
		border: cssValue,
		radius: cssValue,
		buttonRadius: cssValue,
		font: cssValue
	})
	.partial();

const integrationsSchema = z.object({
	posthog: z.boolean(),
	googleConsentMode: z.boolean(),
	microsoftUet: z.boolean(),
	meta: z.boolean(),
	tiktok: z.boolean(),
	scriptBlocking: z.boolean()
}) satisfies z.ZodType<ConsentIntegrations>;

/** Language code ("en", "pt-br") or "*" for every language. */
export const LANG_RE = /^([a-z]{2}(-[a-z]{2})?|\*)$/;

export const consentSettingsSchema = z.object({
	enabled: z.boolean(),
	rev: z.number().int().min(1).max(999_999),
	position: z.enum(BANNER_POSITIONS),
	floatingButton: z.boolean(),
	preferencesCategory: z.boolean(),
	noticeBanner: z.object({ optOut: z.boolean(), notice: z.boolean() }),
	theme: themeSchema,
	texts: z.record(z.string().regex(LANG_RE), textsSchema),
	cookies: z.array(cookieInfoSchema).max(200),
	integrations: integrationsSchema,
	/** Show the store logo at the top of the banner (when the store has one). */
	showLogo: z.boolean()
});
export type ConsentSettings = z.infer<typeof consentSettingsSchema>;

/**
 * What this store really sets (checked against `cookies.set(` and browser storage, Nov 2026).
 * Admin-only cookies (admin sign-in, device, Canva/ads OAuth) never reach shoppers and are omitted.
 * No preference cookies exist (the wishlist is a feature the shopper asks for), so the Preferences
 * category is off by default.
 */
export const DEFAULT_COOKIES: CookieInfo[] = [
	{
		name: 'wlc_consent',
		label: 'Your cookie choice',
		provider: 'This store',
		category: 'necessary',
		purpose: 'Remembers your cookie choice so we do not ask on every page.',
		duration: '6 to 12 months'
	},
	{
		name: 'cart',
		label: 'Your shopping bag',
		provider: 'This store',
		category: 'necessary',
		purpose: 'Keeps the items in your bag.',
		duration: '30 days'
	},
	{
		name: 'eb_customer',
		label: 'Your sign-in',
		provider: 'This store',
		category: 'necessary',
		purpose: 'Keeps you signed in to your account.',
		duration: '30 days'
	},
	{
		name: 'eb_wishlist',
		label: 'Your wishlist',
		provider: 'This store',
		category: 'necessary',
		purpose: 'Remembers the items you save to your wishlist (kept in your browser).',
		duration: 'Until you clear it'
	},
	{
		name: '__stripe_mid, __stripe_sid',
		label: 'Card fraud protection',
		provider: 'Stripe',
		category: 'necessary',
		purpose: 'Helps prevent card fraud when you pay at checkout.',
		duration: '1 year / 30 minutes'
	},
	{
		name: 'ph_*',
		label: 'Visit counts',
		provider: 'PostHog',
		category: 'analytics',
		purpose: 'Counts visits and finds errors so we can improve the store.',
		duration: '1 year'
	},
	{
		name: 'wlc_attr',
		label: 'The ad or link that brought you here',
		provider: 'This store',
		category: 'marketing',
		purpose: 'Remembers which ad or link brought you here, so we know which ads work.',
		duration: '30 days'
	},
	{
		name: '_fbp, _fbc',
		label: 'Meta ad results',
		provider: 'Meta (Facebook, Instagram)',
		category: 'marketing',
		purpose: 'Read to tell Meta which ad led to a purchase.',
		duration: '90 days'
	},
	{
		name: '_ttp',
		label: 'TikTok ad results',
		provider: 'TikTok',
		category: 'marketing',
		purpose: 'Read to tell TikTok which ad led to a purchase.',
		duration: '13 months'
	}
];

export const DEFAULT_CONSENT_SETTINGS: ConsentSettings = {
	enabled: true,
	rev: 1,
	position: 'auto',
	floatingButton: true,
	preferencesCategory: false,
	noticeBanner: { optOut: true, notice: false },
	theme: {},
	texts: {},
	cookies: DEFAULT_COOKIES,
	integrations: {
		posthog: true,
		googleConsentMode: true,
		microsoftUet: true,
		meta: true,
		tiktok: true,
		scriptBlocking: true
	},
	showLogo: true
};

const clone = <T>(v: T): T => structuredClone(v);

/** Saved settings merged over the defaults; anything invalid falls back to the default. */
export async function getConsentSettings(): Promise<ConsentSettings> {
	const saved = await getSetting<unknown>(CONSENT_SETTING, null);
	return parseConsentSettings(saved);
}

export function parseConsentSettings(saved: unknown): ConsentSettings {
	const base = clone(DEFAULT_CONSENT_SETTINGS);
	if (!saved || typeof saved !== 'object') return base;
	const merged = { ...base, ...(saved as Record<string, unknown>) };
	const ok = consentSettingsSchema.safeParse(merged);
	if (ok.success) return ok.data;
	// Keep every valid field, default the rest.
	const out = { ...base } as Record<string, unknown>;
	const shape = consentSettingsSchema.shape;
	for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
		const one = shape[key].safeParse(merged[key]);
		if (one.success) out[key] = one.data;
	}
	return out as ConsentSettings;
}

/** The parts whose change means visitors must be asked again. A display label changes no cookie. */
const askedAgainKey = (s: ConsentSettings) =>
	JSON.stringify([s.texts, s.cookies.map(({ label: _, ...c }) => c), s.preferencesCategory]);

/** Rows saved before labels existed get the default label for the same cookie name. */
export function withCookieLabels(cookies: readonly CookieInfo[]): CookieInfo[] {
	return cookies.map((c) => {
		if (c.label?.trim()) return c;
		const label = DEFAULT_COOKIES.find((d) => d.name === c.name)?.label;
		const { label: _, ...rest } = c;
		return label ? { ...rest, label } : rest;
	});
}

async function snapshot(s: ConsentSettings, now: number) {
	await getDb()
		.insert(schema.consentVersions)
		.values({
			rev: s.rev,
			createdAt: now,
			textsJson: JSON.stringify({ texts: s.texts, preferencesCategory: s.preferencesCategory }),
			cookiesJson: JSON.stringify(s.cookies)
		})
		.onConflictDoNothing()
		.run();
}

/**
 * Saves new settings. Returns the saved value (with the new rev when wording, categories or
 * cookies changed, or when `askAgain` is set). `rev` in `next` is ignored.
 */
export async function saveConsentSettings(
	next: ConsentSettings,
	opts: { askAgain?: boolean; now?: number } = {}
): Promise<{ ok: true; settings: ConsentSettings } | { ok: false; error: string }> {
	const now = opts.now ?? Date.now();
	const prev = await getConsentSettings();
	const parsed = consentSettingsSchema.safeParse({ ...next, rev: prev.rev });
	if (!parsed.success)
		return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form.' };
	const value = parsed.data;
	const bump = opts.askAgain || askedAgainKey(prev) !== askedAgainKey(value);
	if (bump) {
		await snapshot(prev, now); // keep what earlier visitors saw, if not kept yet
		value.rev = prev.rev + 1;
		await snapshot(value, now);
	}
	await setSetting(CONSENT_SETTING, value);
	return { ok: true, settings: value };
}
