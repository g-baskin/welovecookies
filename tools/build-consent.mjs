// Build the We Love Cookies browser script and the WordPress plugin zip: npm run build
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const esbuild = './node_modules/.bin/esbuild';
// Licence notice kept in the built files so every site serving them passes on the terms and the source link.
const banner = '/*! We Love Cookies | (c) 2026 g-baskin | AGPL-3.0-only | Source: https://github.com/g-baskin/welovecookies */';
const common = ['--bundle', '--minify', '--target=es2019', '--legal-comments=none', `--banner:js=${banner}`];
execFileSync(
	esbuild,
	['src/lib/consent/standalone.ts', ...common, '--format=iife', '--outfile=dist/welovecookies.min.js'],
	{ stdio: 'inherit' }
);
execFileSync(
	esbuild,
	['src/lib/consent/index.ts', ...common, '--format=esm', '--outfile=dist/welovecookies.mjs'],
	{ stdio: 'inherit' }
);
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
// -X drops extra file attributes; zip is run inside wordpress/ so the archive holds welovecookies/...
execFileSync('zip', ['-q', '-r', '-X', '../dist/welovecookies-wordpress.zip', 'welovecookies', '-x', '*.DS_Store'], {
	cwd: 'wordpress',
	stdio: 'inherit'
});
console.log('dist/welovecookies-wordpress.zip: WordPress plugin');
