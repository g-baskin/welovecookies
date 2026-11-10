import { expect, test, type Page } from '@playwright/test';
import { DEMO_URL } from './admin-env.mjs';

// A test page at the demo origin: the real built script, a tag manager that injects Clarity with
// createElement, a Hotjar tag written in the HTML, a LinkedIn tag set through innerHTML (which a
// browser never runs) and a first-party script. The vendor URLs are fake responses served by
// page.route, so nothing leaves the machine.
const PAGE = `${DEMO_URL}/demo/trackers-test.html`;
const CLARITY = 'https://www.clarity.ms/tag/test';
const HOTJAR = 'https://static.hotjar.com/c/hotjar-1.js';
const LINKEDIN = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';

async function open(page: Page, attrs: string, config = '') {
	const requests: string[] = [];
	const ran = (name: string) =>
		`window.__ran = (window.__ran || []).concat(${JSON.stringify(name)});`;
	const js = (body: string) => ({ contentType: 'text/javascript', body });
	await page.route(CLARITY, (r) => (requests.push('clarity'), r.fulfill(js(ran('clarity')))));
	await page.route(HOTJAR, (r) => (requests.push('hotjar'), r.fulfill(js(ran('hotjar')))));
	await page.route(LINKEDIN, (r) => (requests.push('linkedin'), r.fulfill(js(ran('linkedin')))));
	await page.route(`${DEMO_URL}/demo/first-party.js`, (r) => r.fulfill(js(ran('first'))));
	await page.route(PAGE, (r) =>
		r.fulfill({
			contentType: 'text/html',
			body: `<!doctype html><html lang="en"><head>
<script>${config}</script>
<script src="/dist/welovecookies.min.js" ${attrs}></script>
<script>var s = document.createElement('script'); s.async = true; s.src = ${JSON.stringify(CLARITY)}; document.head.appendChild(s);</script>
<script src="${HOTJAR}"></script>
<script src="/demo/first-party.js"></script>
</head><body><p>Trackers test</p><div id="html"></div>
<script>document.getElementById('html').innerHTML = '<script src="${LINKEDIN}"><\\/script>';</script>
</body></html>`
		})
	);
	await page.goto(PAGE);
	await expect(page.getByText('Trackers test')).toBeVisible();
	const ranList = () => page.evaluate(() => (window as { __ran?: string[] }).__ran ?? []);
	return { requests, ran: ranList };
}

test('ask-first: known trackers wait for Accept all, then run once', async ({ page }) => {
	const t = await open(page, 'data-mode="opt-in"');
	await expect.poll(t.ran).toEqual(['first']);
	expect(t.requests).not.toContain('clarity'); // a createElement tag is never even requested
	await expect(page.locator('#html script[data-wlc-held]')).toHaveCount(1); // held, yet inert
	await page.getByRole('button', { name: 'Accept all' }).click();
	await expect
		.poll(async () => (await t.ran()).slice().sort())
		.toEqual(['clarity', 'first', 'hotjar']);
	await expect(page.locator('#html script[src]')).toHaveCount(1); // restored, still never run
	await page.waitForTimeout(300);
	expect((await t.ran()).length).toBe(3); // once each, and never the innerHTML tag
});

test('ask-first: Reject all keeps known trackers held', async ({ page }) => {
	const t = await open(page, 'data-mode="opt-in"');
	await page.getByRole('button', { name: 'Reject all' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
	await page.waitForTimeout(300);
	expect(await t.ran()).toEqual(['first']);
	expect(t.requests).not.toContain('clarity');
});

test('opt-out mode runs known trackers straight away', async ({ page }) => {
	const t = await open(page, 'data-mode="opt-out"');
	await expect
		.poll(async () => (await t.ran()).slice().sort())
		.toEqual(['clarity', 'first', 'hotjar']);
});

test('integrations.knownTrackers false turns holding off', async ({ page }) => {
	const t = await open(
		page,
		'data-mode="opt-in"',
		'window.WeLoveCookiesConfig = { integrations: { knownTrackers: false } };'
	);
	await expect
		.poll(async () => (await t.ran()).slice().sort())
		.toEqual(['clarity', 'first', 'hotjar']);
});
