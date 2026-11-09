import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'wlc-dist-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('committed dist/', () => {
	it('matches a fresh build of src (run `npm run build` and commit dist/ if this fails)', () => {
		execFileSync(process.execPath, ['tools/build-consent.mjs', tmp], { cwd: root, stdio: 'pipe' });
		for (const f of ['welovecookies.min.js', 'welovecookies.mjs']) {
			const built = readFileSync(join(tmp, f), 'utf8');
			expect(built.startsWith('/*! We Love Cookies |')).toBe(true);
			expect(readFileSync(join(root, 'dist', f), 'utf8'), f).toBe(built);
		}
	}, 30_000);
});
