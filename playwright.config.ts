import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';
import { ADMIN_URL, DEMO_PORT, DEMO_URL } from './e2e/admin-env.mjs';

// Paths are absolute so e2e/screenshots.config.ts can extend this file from another folder.
const root = import.meta.dirname;

export default defineConfig({
	testDir: join(root, 'e2e'),
	outputDir: join(root, 'test-results'),
	fullyParallel: true,
	reporter: 'list',
	use: { viewport: { width: 1280, height: 800 }, trace: 'retain-on-failure' },
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }
		}
	],
	webServer: [
		{
			command: 'node tools/serve-demo.mjs',
			cwd: root,
			env: { PORT: String(DEMO_PORT) },
			url: `${DEMO_URL}/demo/`,
			reuseExistingServer: false
		},
		{
			command: 'node e2e/start-admin.mjs',
			cwd: root,
			url: `${ADMIN_URL}/admin/login`,
			reuseExistingServer: false,
			timeout: 120_000
		}
	]
});
