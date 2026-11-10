// Self-hosted admin entry: checks Node first (node:sqlite needs 22.13+), then starts run.ts.
// Built by `npm run admin:node:build`; setup: docs/ADMIN-SELF-HOSTED.md
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
	console.error(
		`We Love Cookies admin needs Node.js 22.13 or newer (for node:sqlite); this is ${process.version}.`
	);
	process.exit(1);
}
// admin/.env when present; variables already set in the environment win.
const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

await import('./run.ts');
