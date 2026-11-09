// Build the Ecom Cookie browser core: node tools/build-consent.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const esbuild = './node_modules/.bin/esbuild';
const common = ['--bundle', '--minify', '--target=es2019', '--legal-comments=none'];
execFileSync(
	esbuild,
	[
		'src/lib/consent/standalone.ts',
		...common,
		'--format=iife',
		'--outfile=static/consent/ecom-cookie.min.js'
	],
	{ stdio: 'inherit' }
);
execFileSync(
	esbuild,
	[
		'src/lib/consent/index.ts',
		...common,
		'--format=esm',
		'--outfile=static/consent/ecom-cookie.mjs'
	],
	{ stdio: 'inherit' }
);
for (const f of ['static/consent/ecom-cookie.min.js', 'static/consent/ecom-cookie.mjs']) {
	const b = readFileSync(f);
	console.log(
		`${f}: ${(b.length / 1024).toFixed(1)} KB min, ${(gzipSync(b, { level: 9 }).length / 1024).toFixed(1)} KB min+gzip`
	);
}
