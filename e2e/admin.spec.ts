import { expect, test } from '@playwright/test';
import { ADMIN_PASSWORD, ADMIN_URL } from './admin-env.mjs';
import { shot } from './shots.ts';

test('sign-in: a wrong password is refused, the right one opens the admin', async ({
	page
}, info) => {
	await page.goto(`${ADMIN_URL}/admin`);
	await expect(page).toHaveURL(/\/admin\/login$/);

	await page.getByLabel('Password').fill('not-the-password-at-all');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page.getByRole('alert')).toHaveText('That password is not right.');

	await page.getByLabel('Password').fill(ADMIN_PASSWORD);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
	await shot(page, info, 'admin-overview');

	await page
		.getByRole('navigation', { name: 'Admin' })
		.getByRole('link', { name: 'Websites' })
		.click();
	await expect(page.getByRole('heading', { level: 1, name: 'Websites' })).toBeVisible();
});

test('public endpoints: the script is served and unknown websites get 404', async ({ request }) => {
	const script = await request.get(`${ADMIN_URL}/welovecookies.min.js`);
	expect(script.status()).toBe(200);
	expect(await script.text()).toContain('AGPL-3.0-only');

	const config = await request.get(`${ADMIN_URL}/api/consent/config?site=ws_unknownsite1`);
	expect(config.status()).toBe(404);
	expect(await config.json()).toEqual({ error: 'Unknown website.' });
});
