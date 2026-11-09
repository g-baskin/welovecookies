import { describe, expect, it } from 'vitest';
import { deviceOf } from './device.ts';

describe('deviceOf', () => {
	it('classifies phones, tablets (incl. iPadOS desktop UA) and desktops', () => {
		expect(deviceOf(390, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile', 5)).toBe('phone');
		expect(deviceOf(820, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', 5)).toBe(
			'tablet'
		);
		expect(deviceOf(1180, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', 5)).toBe(
			'tablet'
		);
		expect(deviceOf(1440, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', 0)).toBe(
			'desktop'
		);
		expect(deviceOf(1440, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 10)).toBe('desktop');
		expect(deviceOf(800, 'Mozilla/5.0 (Linux; Android 14; SM-X200)', 5)).toBe('tablet');
	});
});
