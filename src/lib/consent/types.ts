/**
 * We Love Cookies: the shared consent contract (framework-free, no SvelteKit imports).
 * Used by the browser core (banner, signals), the standalone script and any server that records
 * choices. Change it only additively; servers depend on it.
 * Engineering defaults, not legal advice.
 */

/** `necessary` is always on and never stored as a choice. */
export const CONSENT_CATEGORIES = ['necessary', 'preferences', 'analytics', 'marketing'] as const;
export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];
export const OPTIONAL_CATEGORIES = ['preferences', 'analytics', 'marketing'] as const;
export type OptionalCategory = (typeof OPTIONAL_CATEGORIES)[number];
/** What the visitor allows. `marketing` covers ad attribution and sharing with ad platforms. */
export type Grants = Record<OptionalCategory, boolean>;

export const ALL_GRANTED: Grants = { preferences: true, analytics: true, marketing: true };
export const NONE_GRANTED: Grants = { preferences: false, analytics: false, marketing: false };

/**
 * Region modes (see regions.ts for the country table and MODE_RULES for behaviour):
 *  opt-in        EU/EEA, Quebec, Brazil, China, Korea...: nothing optional before Accept.
 *  opt-in-uk     UK: as opt-in (DUAA 2025 analytics exemption noted, not relied on by default).
 *  opt-in-light  consent-based laws with lighter banner rules (India until 2027, Mexico...).
 *  opt-out-gpc   US states that legally require honouring Global Privacy Control.
 *  opt-out       other opt-out laws (some US states, Canada outside Quebec, Switzerland if chosen).
 *  notice        no cookie consent law: inform only.
 */
export const CONSENT_MODES = [
	'opt-in',
	'opt-in-uk',
	'opt-in-light',
	'opt-out-gpc',
	'opt-out',
	'notice'
] as const;
export type ConsentMode = (typeof CONSENT_MODES)[number];

/**
 * accept_all / reject_all / custom: banner or preferences buttons.
 * acknowledge: "OK" on an opt-out/notice banner (keeps the mode's defaults).
 * withdraw: turned everything off after having allowed something (privacy page or panel).
 * gpc: recorded automatically when Global Privacy Control turned marketing off.
 */
export const CONSENT_ACTIONS = [
	'accept_all',
	'reject_all',
	'custom',
	'acknowledge',
	'withdraw',
	'gpc'
] as const;
export type ConsentAction = (typeof CONSENT_ACTIONS)[number];

export const DEVICES = ['phone', 'tablet', 'desktop'] as const;
export type Device = (typeof DEVICES)[number];

/** The choice saved in the first-party cookie (see cookie.ts for the wire format). */
export interface StoredConsent {
	/** Random consent id (16 url-safe chars): the proof-of-consent lookup key. */
	id: string;
	/** When the choice was made (ms since epoch). */
	at: number;
	/** The region mode in force when the choice was made. */
	mode: ConsentMode;
	/** The banner revision the visitor answered; the owner bumps it to ask again. */
	rev: number;
	grants: Grants;
	action: ConsentAction;
}

/** POST body (JSON) sent to `endpoints.record` (your own proof-of-consent endpoint). */
export interface ConsentRecordPayload {
	id: string;
	action: ConsentAction;
	grants: Grants;
	mode: ConsentMode;
	rev: number;
	/** Language the banner was shown in (BCP 47 primary tag, e.g. "de"). */
	lang: string;
	device: Device;
	/** Browser Global Privacy Control seen by the client. */
	gpc: boolean;
	/** Path only, never the query string. */
	page: string;
	/** Site key when the banner runs on another website (hosted install). */
	site?: string;
	/** Optional same-origin landing URL (with ad tags) so the server can keep the ad visit on Accept. */
	landing?: string;
}
/** Record endpoint reply. The server may correct the saved choice (e.g. GPC forces marketing off). */
export interface ConsentRecordResponse {
	ok: true;
	consent: StoredConsent;
}

/** POST body (JSON) to the impression endpoint (`/api/consent/seen`): cookieless aggregate count. */
export interface ConsentSeenPayload {
	mode: ConsentMode;
	device: Device;
	lang: string;
	/** Site key when the banner runs on another website (hosted install). */
	site?: string;
}

/**
 * Hosted install: `<script src="https://<your-server>/welovecookies.min.js" data-site="<site key>"
 * async></script>`. The script fetches HOSTED_CONFIG_PATH?site=<key> from the server that serves it,
 * which answers a ConsentConfig for this visitor (region from the visitor's connection, absolute
 * endpoints that accept that site's origin).
 */
export const HOSTED_CONFIG_PATH = '/api/consent/config';

/** One row of the visitor-facing cookie list. */
export interface CookieInfo {
	/** Plain name visitors read, e.g. "Sign-in" (never a technical cookie or field name). */
	name: string;
	/** Plain-words name shown to visitors, e.g. "Keeps you signed in"; the cookie name shows under it. */
	label?: string;
	provider: string;
	category: ConsentCategory;
	/** Plain words, one sentence. */
	purpose: string;
	/** Plain words, e.g. "6 months", "Session". */
	duration: string;
}

/** Every visible string. Built-in translations live in i18n.ts; the owner may override any. */
export interface ConsentTexts {
	/** Banner heading, e.g. "Cookies, the useful kind". */
	title: string;
	/** Banner body for opt-in modes (keep under ~40 words). */
	body: string;
	/** Banner body for opt-out modes (US etc.): inform + how to opt out. */
	noticeBody: string;
	acceptAll: string;
	rejectAll: string;
	customize: string;
	/** "OK" on an opt-out / notice banner. */
	acknowledge: string;
	save: string;
	close: string;
	preferencesTitle: string;
	preferencesIntro: string;
	/** Label next to the locked Necessary switch. */
	alwaysOn: string;
	categories: Record<ConsentCategory, { title: string; description: string }>;
	/** "See cookies" toggle in the preferences panel. */
	showCookies: string;
	hideCookies: string;
	cookieTable: { name: string; provider: string; purpose: string; duration: string };
	privacyPolicy: string;
	cookiePolicy: string;
	/** Footer/floating button label, e.g. "Cookie settings". */
	reopen: string;
	/** "Do Not Sell or Share My Personal Information" (opt-out-gpc and opt-out modes). */
	doNotSell: string;
	/** Shown when GPC is detected, e.g. "Your opt-out preference signal was honored." */
	gpcHonored: string;
	/** Short confirmation after saving, e.g. "Saved. You can change this anytime." */
	saved: string;
}

/** Owner wording overrides for one language: any string, any single category field. */
export type ConsentTextOverrides = Partial<Omit<ConsentTexts, 'categories' | 'cookieTable'>> & {
	categories?: Partial<Record<ConsentCategory, Partial<{ title: string; description: string }>>>;
	cookieTable?: Partial<ConsentTexts['cookieTable']>;
};

/** Visual settings. Every value is a CSS value; unset values fall back to the page's CSS variables. */
export interface ConsentTheme {
	bg: string;
	fg: string;
	muted: string;
	mutedFg: string;
	primary: string;
	primaryFg: string;
	border: string;
	radius: string;
	buttonRadius: string;
	font: string;
}

/**
 * Desktop/tablet placement. Phones always get a bottom sheet.
 * auto = bottom-left card on desktop and tablet landscape, bottom-center card on tablet portrait.
 */
export const BANNER_POSITIONS = ['auto', 'bottom-left', 'bottom-right', 'bottom-center'] as const;
export type BannerPosition = (typeof BANNER_POSITIONS)[number];

export interface ConsentIntegrations {
	/** gtag Consent Mode v2 default + update (ad_storage, ad_user_data, ad_personalization, analytics_storage). */
	googleConsentMode: boolean;
	/** Microsoft UET consent mode (ad_storage). */
	microsoftUet: boolean;
	/** fbq('consent', 'grant' | 'revoke'). */
	meta: boolean;
	/** ttq.holdConsent / grantConsent / revokeConsent. */
	tiktok: boolean;
	/** posthog opt_in_capturing / opt_out_capturing on window.posthog or the instance passed in. */
	posthog: boolean;
	/** Activate <script type="text/plain" data-consent="analytics|marketing|preferences"> when allowed. */
	scriptBlocking: boolean;
	/**
	 * Hold well-known trackers (Hotjar, Clarity, LinkedIn...; trackers.ts) that other scripts add
	 * after the banner loaded, until their category is allowed. On by default.
	 */
	knownTrackers: boolean;
}

/** Everything the browser core needs: from the page, the script tag, or a server per request. */
export interface ConsentConfig {
	/** Resolved region mode; 'auto' (standalone only) guesses from the browser time zone. */
	mode: ConsentMode | 'auto';
	country?: string | null;
	region?: string | null;
	/** Sec-GPC seen by the server (the client also checks navigator.globalPrivacyControl). */
	gpc?: boolean;
	/** Current banner revision; a stored choice with a lower rev is asked again. */
	rev: number;
	/** Force a language; otherwise the browser languages pick from the built-in ones. */
	lang?: string;
	/** Owner overrides per language code ("en", "de", ...); "*" applies to every language. */
	texts?: Record<string, ConsentTextOverrides>;
	theme?: Partial<ConsentTheme>;
	position?: BannerPosition;
	/** Show the Preferences category (off when the site has no preference cookies). */
	preferencesCategory?: boolean;
	/** Small cookie button to reopen settings after a choice. */
	floatingButton?: boolean;
	/** Also show a short notice banner in opt-out modes (default true) and notice mode (default false). */
	noticeBanner?: { optOut: boolean; notice: boolean };
	cookies?: CookieInfo[];
	links?: { privacyPolicy?: string; cookiePolicy?: string; privacyChoices?: string };
	/** Server logging; when absent the core only writes the cookie. */
	endpoints?: { record?: string; seen?: string };
	cookieName?: string;
	/**
	 * Where the choice cookie lives. 'auto' (default) finds the site's root domain with a test
	 * cookie, so one choice covers blog.example.com and example.com. A domain string forces it.
	 */
	cookieDomain?: string | 'auto';
	integrations?: Partial<ConsentIntegrations>;
	/** Logo shown at the top of the banner (your logo); absent = the cookie illustration. */
	logoUrl?: string | null;
	/** Your site or brand name, used as the logo's alt text (plain words). */
	brandName?: string;
	/**
	 * Extra technical cookie names to delete when a category is switched off (a trailing * is a
	 * prefix). Never shown to people. Added to the built-in list in autoclear.ts.
	 */
	autoClear?: Partial<Record<OptionalCategory, string[]>>;
	/**
	 * Extra script hosts to hold until a category is allowed, as `host` or `host/path-prefix`
	 * (subdomains included). Added to the built-in list in trackers.ts; needs `knownTrackers` on.
	 */
	blockScripts?: Partial<Record<OptionalCategory, string[]>>;
	/** Site key for the hosted install, sent with every record. */
	site?: string;
	/** Path prefixes where the banner is compact and the floating button hidden (e.g. "/signup"). */
	compactOn?: string[];
	/** CSS selector of a fixed bottom bar (e.g. a sticky call-to-action) the banner must sit above. */
	avoidSelector?: string;
}

/** Name of the consent cookie. */
export const CONSENT_COOKIE_NAME = 'wlc_consent';
