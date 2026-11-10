// npm run test:local: install and test a fresh copy of the current files (committed or not) in a
// temp folder, the way a new developer would, then smoke-test the demo and the admin over HTTP.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ADMIN_PASSWORD, ADMIN_URL } from '../e2e/admin-env.mjs';

const repo = join(import.meta.dirname, '..');
const work = mkdtempSync(join(tmpdir(), 'wlc-local-'));
const demoPort = 4183;
const demoUrl = `http://127.0.0.1:${demoPort}`;
const win = process.platform === 'win32';
/** @type {import('node:child_process').ChildProcess[]} */
const servers = [];
let failed = false;

/** @param {string} name @param {() => unknown | Promise<unknown>} fn */
async function step(name, fn) {
	if (failed) return;
	const t = Date.now();
	try {
		await fn();
		console.log(`PASS  ${name} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
	} catch (err) {
		failed = true;
		console.log(`FAIL  ${name}\n${err instanceof Error ? err.message : err}`);
	}
}

/** @param {string} script @param {string[]} args */
function npm(script, ...args) {
	const r = spawnSync('npm', [script, ...args], {
		cwd: work,
		encoding: 'utf8',
		shell: win,
		maxBuffer: 64 * 1024 * 1024
	});
	// The tail holds the failing test or error; the full log can run to thousands of lines.
	if (r.status !== 0)
		throw new Error(
			`npm ${script} ${args.join(' ')} failed:\n${`${r.stdout}\n${r.stderr}`.slice(-6000)}`
		);
}

/** @param {string} file */
const hash = (file) =>
	createHash('sha256')
		.update(readFileSync(join(work, file)))
		.digest('hex');

/** @param {string} cmd @param {string[]} args @param {Record<string, string>} [env] */
function start(cmd, args, env = {}) {
	const child = spawn(cmd, args, {
		cwd: work,
		env: { ...process.env, ...env },
		stdio: 'ignore',
		detached: !win
	});
	servers.push(child);
}

/** @param {string} url @param {number} ms */
async function waitFor(url, ms) {
	const end = Date.now() + ms;
	while (Date.now() < end) {
		try {
			if ((await fetch(url)).ok) return;
		} catch {
			// not listening yet
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error(`${url} did not answer within ${ms / 1000}s`);
}

/** @param {boolean} ok @param {string} what */
function expect(ok, what) {
	if (!ok) throw new Error(what);
}

/** @param {string} url */
async function portFree(url) {
	try {
		await fetch(url);
		return false;
	} catch {
		return true;
	}
}

async function stopServers() {
	for (const child of servers) {
		if (child.exitCode !== null || !child.pid) continue;
		const exited = new Promise((r) => child.once('exit', r));
		try {
			if (win) child.kill();
			else process.kill(-child.pid, 'SIGTERM');
		} catch {
			continue;
		}
		const timer = setTimeout(() => {
			try {
				if (win) child.kill('SIGKILL');
				else process.kill(-(child.pid ?? 0), 'SIGKILL');
			} catch {
				// already gone
			}
		}, 5000);
		await exited;
		clearTimeout(timer);
	}
}

for (const sig of /** @type {const} */ (['SIGINT', 'SIGTERM']))
	process.on(sig, async () => {
		await stopServers();
		rmSync(work, { recursive: true, force: true });
		process.exit(130);
	});

try {
	await step('copy current files to a temp folder', () => {
		const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
			cwd: repo,
			encoding: 'utf8'
		})
			.split('\0')
			.filter(Boolean);
		for (const f of files) {
			const from = join(repo, f);
			if (!existsSync(from)) continue; // deleted but not yet committed
			mkdirSync(dirname(join(work, f)), { recursive: true });
			cpSync(from, join(work, f));
		}
		expect(existsSync(join(work, 'package-lock.json')), 'package-lock.json missing from the copy');
	});
	await step('npm ci', () => npm('ci', '--no-audit', '--no-fund'));
	await step('npm test', () => npm('test'));
	await step('npm run check', () => npm('run', 'check'));
	await step('npm run lint', () => npm('run', 'lint'));
	await step('npm run format:check', () => npm('run', 'format:check'));
	await step('npm run build (committed dist JS unchanged)', () => {
		const files = ['dist/welovecookies.min.js', 'dist/welovecookies.mjs'];
		const before = files.map(hash);
		npm('run', 'build');
		files.forEach((f, i) => expect(hash(f) === before[i], `${f} differs from a fresh build`));
		expect(existsSync(join(work, 'dist/welovecookies-wordpress.zip')), 'WordPress zip not built');
	});
	await step('demo serves the page and the script', async () => {
		expect(await portFree(demoUrl), `${demoUrl} is already in use; stop that server first`);
		start(process.execPath, ['tools/serve-demo.mjs'], { PORT: String(demoPort) });
		await waitFor(`${demoUrl}/demo/`, 15_000);
		const page = await (await fetch(`${demoUrl}/demo/`)).text();
		expect(page.includes('../dist/welovecookies.min.js'), 'demo page does not load the script');
		const script = await fetch(`${demoUrl}/dist/welovecookies.min.js`);
		expect(script.status === 200, `script answered ${script.status}`);
		expect(
			(await script.text()).includes('AGPL-3.0-only'),
			'licence banner missing from the script'
		);
	});
	await step('admin: sign-in, Overview and unknown website', async () => {
		expect(await portFree(ADMIN_URL), `${ADMIN_URL} is already in use; stop that server first`);
		start(process.execPath, ['e2e/start-admin.mjs']);
		await waitFor(`${ADMIN_URL}/admin/login`, 120_000);
		const login = await fetch(`${ADMIN_URL}/admin/login`, {
			method: 'POST',
			redirect: 'manual',
			headers: { origin: ADMIN_URL, 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ password: ADMIN_PASSWORD })
		});
		expect(login.status === 303, `sign-in answered ${login.status}, expected 303`);
		const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0];
		expect(cookie.startsWith('__Host-wlc_admin='), 'sign-in set no session cookie');
		const overview = await fetch(`${ADMIN_URL}/admin`, { headers: { cookie } });
		expect(overview.status === 200, `Overview answered ${overview.status}`);
		expect((await overview.text()).includes('<h1>Overview'), 'Overview heading missing');
		const unknown = await fetch(`${ADMIN_URL}/api/consent/config?site=ws_unknownsite1`);
		expect(unknown.status === 404, `unknown website answered ${unknown.status}, expected 404`);
	});
} finally {
	await stopServers();
	rmSync(work, { recursive: true, force: true });
}

console.log(failed ? '\nFresh-install test FAILED' : '\nFresh-install test passed');
process.exit(failed ? 1 : 0);
