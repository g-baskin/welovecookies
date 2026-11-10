// Start the admin Worker for tests: fresh throwaway database in the OS temp folder (never the
// developer's .wrangler data), port 8788 (beside a running admin:dev on 8787), test-only secrets.
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ADMIN_PASSWORD, ADMIN_PORT, SESSION_SECRET } from './admin-env.mjs';

const root = join(import.meta.dirname, '..');
const persist = join(tmpdir(), `wlc-e2e-${ADMIN_PORT}`);
const wrangler = join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const config = join(root, 'admin', 'wrangler.jsonc');
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' };

mkdirSync(join(root, 'admin', 'public'), { recursive: true });
copyFileSync(
	join(root, 'dist', 'welovecookies.min.js'),
	join(root, 'admin', 'public', 'welovecookies.min.js')
);
rmSync(persist, { recursive: true, force: true });

const migrate = spawnSync(
	process.execPath,
	[wrangler, 'd1', 'migrations', 'apply', 'DB', '--local', '-c', config, '--persist-to', persist],
	{ cwd: root, env: { ...env, CI: '1' }, stdio: 'inherit' }
);
if (migrate.status !== 0) process.exit(migrate.status ?? 1);

// --var wins over admin/.dev.vars, so a developer's own password never leaks into the tests.
const dev = spawn(
	process.execPath,
	[
		wrangler,
		'dev',
		'-c',
		config,
		'--ip',
		'127.0.0.1',
		'--port',
		String(ADMIN_PORT),
		'--persist-to',
		persist,
		'--show-interactive-dev-session=false',
		'--var',
		`ADMIN_PASSWORD:${ADMIN_PASSWORD}`,
		'--var',
		`SESSION_SECRET:${SESSION_SECRET}`
	],
	{ cwd: root, env, stdio: 'inherit' }
);
const stop = () => {
	dev.kill('SIGTERM');
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
dev.on('exit', (code) => {
	rmSync(persist, { recursive: true, force: true });
	process.exit(code ?? 0);
});
