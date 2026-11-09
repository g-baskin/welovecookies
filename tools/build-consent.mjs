// Build the We Love Cookies browser script and the WordPress plugin zip: npm run build
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const esbuild = './node_modules/.bin/esbuild';
const common = ['--bundle', '--minify', '--target=es2019', '--legal-comments=none'];
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

mkdirSync('wordpress/welovecookies/assets', { recursive: true });
copyFileSync('dist/welovecookies.min.js', 'wordpress/welovecookies/assets/welovecookies.min.js');
rmSync('dist/welovecookies-wordpress.zip', { force: true });
// -X drops extra file attributes; zip is run inside wordpress/ so the archive holds welovecookies/...
execFileSync('zip', ['-q', '-r', '-X', '../dist/welovecookies-wordpress.zip', 'welovecookies', '-x', '*.DS_Store'], {
	cwd: 'wordpress',
	stdio: 'inherit'
});
console.log('dist/welovecookies-wordpress.zip: WordPress plugin');
