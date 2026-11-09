/** Device class for layout and logging. iPadOS reports a desktop Mac UA but has touch points. */
import type { Device } from './types.ts';

export function deviceOf(width: number, userAgent = '', maxTouchPoints = 0): Device {
	const ua = userAgent.toLowerCase();
	const ipadOs = /macintosh/.test(ua) && maxTouchPoints > 1;
	const tabletUa =
		ipadOs || /ipad|tablet|playbook|silk/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua));
	if (width < 600) return 'phone';
	if (tabletUa || (maxTouchPoints > 0 && width <= 1366 && !/windows|cros|linux x86/.test(ua)))
		return 'tablet';
	if (/iphone|mobile/.test(ua) && width < 900) return 'phone';
	return 'desktop';
}
