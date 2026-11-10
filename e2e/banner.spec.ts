import { expect, test, type BrowserContext } from '@playwright/test';
import { DEMO_URL } from './admin-env.mjs';
import { shot } from './shots.ts';

const consentCookie = async (context: BrowserContext) =>
	(await context.cookies()).find((c) => c.name === 'wlc_consent')?.value;

test('ask-first banner: Accept all saves the choice and stays saved after a reload', async ({
	page,
	context
}, info) => {
	await page.goto(`${DEMO_URL}/demo/`);
	const banner = page.getByRole('region', { name: 'Cookies, the useful kind' });
	await expect(banner).toBeVisible();
	await expect(banner.getByRole('button', { name: 'Reject all' })).toBeVisible();
	await shot(page, info, 'banner-ask-first');

	await banner.getByRole('button', { name: 'Accept all' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Cookie settings' }).first()).toBeVisible();
	await expect(banner).toHaveCount(0);
	await shot(page, info, 'banner-saved');
	await expect
		.poll(() => consentCookie(context))
		.toMatch(/^1\.[A-Za-z0-9_-]{16}\.[0-9a-z]+\.1\.i\.111\.a$/);

	// The demo clears the cookie on every load unless reset=0.
	await page.goto(`${DEMO_URL}/demo/?reset=0`);
	await expect(page.locator('.w')).toBeAttached();
	await expect(page.getByRole('region', { name: 'Cookies, the useful kind' })).toHaveCount(0);
});

test('Reject all saves no optional categories', async ({ page, context }) => {
	await page.goto(`${DEMO_URL}/demo/`);
	await page.getByRole('button', { name: 'Reject all' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
	await expect
		.poll(() => consentCookie(context))
		.toMatch(/^1\.[A-Za-z0-9_-]{16}\.[0-9a-z]+\.1\.i\.000\.r$/);
});

test('opt-out mode shows the short notice with OK', async ({ page }) => {
	await page.goto(`${DEMO_URL}/demo/?mode=opt-out`);
	const banner = page.getByRole('region', { name: 'Cookies, the useful kind' });
	await expect(banner).toContainText('You can opt out anytime.');
	await expect(banner.getByRole('button', { name: 'OK' })).toBeVisible();
	await expect(banner.getByRole('button', { name: 'Accept all' })).toHaveCount(0);
});

test('notice mode shows no banner, only the cookie button', async ({ page }) => {
	await page.goto(`${DEMO_URL}/demo/?mode=notice`);
	await expect(page.getByRole('button', { name: 'Cookie settings' }).first()).toBeVisible();
	await expect(page.getByRole('region', { name: 'Cookies, the useful kind' })).toHaveCount(0);
});

test('Arabic reads right to left', async ({ page }) => {
	await page.goto(`${DEMO_URL}/demo/?lang=ar`);
	await expect(page.getByRole('region')).toBeVisible();
	await expect(page.locator('.w')).toHaveAttribute('dir', 'rtl');
	await expect(page.locator('.w')).toHaveAttribute('lang', 'ar');
});
