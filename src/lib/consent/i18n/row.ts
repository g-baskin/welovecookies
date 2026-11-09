/** One language as a positional row (keeps the bundle small); see i18n.ts toTexts for the order. */
export type Row = [
	title: string, body: string, noticeBody: string, acceptAll: string, rejectAll: string,
	customize: string, acknowledge: string, save: string, close: string, preferencesTitle: string,
	preferencesIntro: string, alwaysOn: string,
	necessary: string, necessaryDesc: string, preferences: string, preferencesDesc: string,
	analytics: string, analyticsDesc: string, marketing: string, marketingDesc: string,
	showCookies: string, hideCookies: string, tName: string, tProvider: string, tPurpose: string,
	tDuration: string, privacyPolicy: string, cookiePolicy: string, reopen: string,
	doNotSell: string, gpcHonored: string, saved: string
]; // prettier-ignore
