// Build the We Love Cookies browser script and the WordPress plugin zip: npm run build
import { execFileSync } from 'node:child_process';
import {
	chmodSync,
	copyFileSync,
	cpSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	utimesSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const esbuild = './node_modules/.bin/esbuild';
// `node tools/build-consent.mjs <dir>` builds only the two scripts into <dir> (dist.test.ts compares them with dist/).
const out = process.argv[2] ?? 'dist';
// Licence notice kept in the built files so every site serving them passes on the terms and the source link.
const banner =
	'/*! We Love Cookies | (c) 2026 g-baskin | AGPL-3.0-only | Source: https://github.com/g-baskin/welovecookies */';
const common = [
	'--bundle',
	'--minify',
	'--target=es2019',
	'--legal-comments=none',
	`--banner:js=${banner}`
];
execFileSync(
	esbuild,
	[
		'src/lib/consent/standalone.ts',
		...common,
		'--format=iife',
		`--outfile=${out}/welovecookies.min.js`
	],
	{ stdio: 'inherit' }
);
execFileSync(
	esbuild,
	['src/lib/consent/index.ts', ...common, '--format=esm', `--outfile=${out}/welovecookies.mjs`],
	{ stdio: 'inherit' }
);
if (out !== 'dist') process.exit(0);
for (const f of ['dist/welovecookies.min.js', 'dist/welovecookies.mjs']) {
	const b = readFileSync(f);
	console.log(
		`${f}: ${(b.length / 1024).toFixed(1)} KB min, ${(gzipSync(b, { level: 9 }).length / 1024).toFixed(1)} KB min+gzip`
	);
}

// The optional admin Worker serves the same script for hosted installs (admin/public is gitignored).
mkdirSync('admin/public', { recursive: true });
copyFileSync('dist/welovecookies.min.js', 'admin/public/welovecookies.min.js');
mkdirSync('wordpress/welovecookies/assets', { recursive: true });
copyFileSync('dist/welovecookies.min.js', 'wordpress/welovecookies/assets/welovecookies.min.js');
rmSync('dist/welovecookies-wordpress.zip', { force: true });
// Zip a staged copy with fixed dates, modes and order, so every build on every machine gives the same bytes.
const stage = mkdtempSync(join(tmpdir(), 'wlc-zip-'));
const fixed = new Date('2026-01-01T00:00:00Z');
cpSync('wordpress/welovecookies', join(stage, 'welovecookies'), {
	recursive: true,
	filter: (src) => !src.endsWith('.DS_Store')
});
/** @type {string[]} */
const entries = [];
/** @param {string} rel */
const walk = (rel) => {
	entries.push(`${rel}/`);
	const list = readdirSync(join(stage, rel), { withFileTypes: true });
	list.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
	for (const e of list) {
		const p = `${rel}/${e.name}`;
		if (e.isDirectory()) walk(p);
		else {
			chmodSync(join(stage, p), 0o644);
			utimesSync(join(stage, p), fixed, fixed);
			entries.push(p);
		}
	}
	// After the children, whose copying would bump the folder's date.
	chmodSync(join(stage, rel), 0o755);
	utimesSync(join(stage, rel), fixed, fixed);
};
walk('welovecookies');
// -X drops uid/gid and extra timestamps, TZ=UTC fixes the stored DOS time, -@ takes the names in this order.
execFileSync('zip', ['-q', '-X', '-@', join(process.cwd(), 'dist/welovecookies-wordpress.zip')], {
	cwd: stage,
	input: `${entries.join('\n')}\n`,
	env: { ...process.env, TZ: 'UTC' },
	stdio: ['pipe', 'inherit', 'inherit']
});
rmSync(stage, { recursive: true, force: true });
console.log('dist/welovecookies-wordpress.zip: WordPress plugin');
