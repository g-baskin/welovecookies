import type { Page, TestInfo } from '@playwright/test';
import { join } from 'node:path';

const dir = join(import.meta.dirname, '..', 'docs', 'assets', 'screenshots');

/** Save a docs screenshot, only when run through e2e/screenshots.config.ts. */
export async function shot(page: Page, info: TestInfo, name: string) {
	if (info.config.metadata.screenshots !== true) return;
	await page.screenshot({ path: join(dir, `${name}.png`) });
}
