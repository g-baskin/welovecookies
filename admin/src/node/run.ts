// The self-hosted admin process: SQLite file, HTTP server, daily job and the backup command.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupProblem } from '../auth.ts';
import { daily } from '../index.ts';
import { backupTo, migrate, openSqlite } from '../sqlite.ts';
import { createHandler, headerName, memoryLimiter, msUntilDaily, publicOrigin } from './http.ts';

// Relative to the bundle in admin/node-dist/.
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const e = process.env;
const fail = (msg: string): never => {
	console.error(msg);
	process.exit(1);
};

const dbPath = resolve(e.WLC_DB_PATH || here('../data/welovecookies.db'));
const [cmd, arg] = process.argv.slice(2);

if (cmd === 'backup') {
	if (!arg) fail('Usage: node admin/node-dist/server.js backup <file>');
	if (!existsSync(dbPath)) fail(`No database at ${dbPath} (set WLC_DB_PATH).`);
	const db = openSqlite(dbPath);
	try {
		backupTo(db, resolve(arg));
		console.log(`Backup written to ${resolve(arg)}`);
	} catch (err) {
		fail(err instanceof Error ? err.message : String(err));
	} finally {
		db.close();
	}
	process.exit(0);
}
if (cmd) fail(`Unknown command "${cmd}". Run with no arguments to start, or: backup <file>`);

const pub = publicOrigin(e.WLC_PUBLIC_URL);
if ('error' in pub) fail(pub.error);
const publicUrl = 'origin' in pub ? pub.origin : '';
const countryHeader = headerName(e.WLC_COUNTRY_HEADER);
const regionHeader = headerName(e.WLC_REGION_HEADER);
if (e.WLC_COUNTRY_HEADER && !countryHeader) fail('WLC_COUNTRY_HEADER is not a valid header name.');
if (e.WLC_REGION_HEADER && !regionHeader) fail('WLC_REGION_HEADER is not a valid header name.');
const port = Number(e.PORT || 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535)
	fail('PORT must be a number from 1 to 65535.');
const scriptPath = resolve(e.WLC_SCRIPT_PATH || here('../../dist/welovecookies.min.js'));
if (!existsSync(scriptPath)) fail(`Banner script not found at ${scriptPath}; run npm run build.`);

// The database and its automatic backups hold personal data: owner-only folder.
mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
const db = openSqlite(dbPath);
try {
	const m = migrate(db);
	if (m.backup) console.log(`Backed up the database to ${m.backup} before migrating.`);
	if (m.applied.length) console.log(`Applied migrations: ${m.applied.join(', ')}`);
} catch (err) {
	db.close();
	fail(err instanceof Error ? err.message : String(err));
}

const env = {
	DB: db,
	ADMIN_PASSWORD: e.ADMIN_PASSWORD,
	SESSION_SECRET: e.SESSION_SECRET,
	PUBLIC_LIMITER: memoryLimiter()
};
if (setupProblem(env))
	console.warn(
		'ADMIN_PASSWORD (12+ characters) and SESSION_SECRET (32+ random characters) must be set in the environment or admin/.env before you can sign in.'
	);
if (!countryHeader)
	console.warn('No WLC_COUNTRY_HEADER: every visitor gets the strictest (opt-in) banner rules.');
if (publicUrl.startsWith('http://') && !/^http:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(publicUrl))
	console.warn('WLC_PUBLIC_URL is not https://; browsers will not keep the sign-in cookie.');

const server = createServer(
	createHandler({
		env,
		publicUrl,
		trustProxy: e.WLC_TRUST_PROXY === '1',
		countryHeader,
		regionHeader,
		script: readFileSync(scriptPath)
	})
);
server.listen(port, e.WLC_HOST || '127.0.0.1', () =>
	console.log(
		`We Love Cookies admin on ${publicUrl} (listening on ${e.WLC_HOST || '127.0.0.1'}:${port}, database ${dbPath})`
	)
);

let timer: NodeJS.Timeout;
const schedule = () => {
	timer = setTimeout(async () => {
		try {
			await daily(db);
		} catch (err) {
			console.error('daily job failed', err instanceof Error ? err.message : err);
		}
		schedule();
	}, msUntilDaily(Date.now()));
};
schedule();

let stopping = false;
const stop = () => {
	if (stopping) return;
	stopping = true;
	clearTimeout(timer);
	server.close(() => {
		db.close();
		process.exit(0);
	});
	server.closeAllConnections();
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
