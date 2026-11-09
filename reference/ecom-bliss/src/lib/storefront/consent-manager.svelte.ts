/**
 * The storefront's Ecom Cookie manager, set by the store layout once the banner has started, so
 * pages (Your privacy choices, footer links) can open the cookie settings panel.
 */
import type { ConsentManager } from '#lib/consent/consent.ts';

export const consentManager = $state<{ current: ConsentManager | null }>({ current: null });
