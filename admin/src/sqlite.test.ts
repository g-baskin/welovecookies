import { copyFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { backupTo, migrate, MIGRATIONS_DIR, openSqlite, type SqliteDb } from './sqlite.ts';
import { addTestSite } from './test-d1.ts';

let tmp = '';
let dir = '';
const open: SqliteDb[] = [];
const db = (name = 'wlc.db') => {
	const d = openSqlite(join(tmp, name));
	open.push(d);
	return d;
};
const names = (d: SqliteDb) =>
	(d.sql.prepare('SELECT name FROM wlc_migrations ORDER BY name').all() as { name: string }[]).map(
		(r) => r.name
	);

beforeEach(() => {
	tmp = mkdtempSync(join(tmpdir(), 'wlc-sqlite-'));
	dir = mkdtempSync(join(tmp, 'migrations-'));
	copyFileSync(join(MIGRATIONS_DIR, '0001_init.sql'), join(dir, '0001_init.sql'));
});
afterEach(() => {
	for (const d of open.splice(0)) d.close();
	rmSync(tmp, { recursive: true, force: true });
});

describe('openSqlite', () => {
	it('turns on WAL, foreign keys and a busy timeout', () => {
		const d = db();
		expect(d.sql.prepare('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' });
		expect(d.sql.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 });
		expect(d.sql.prepare('PRAGMA busy_timeout').get()).toEqual({ timeout: 5000 });
	});
	it('rolls back a failed batch', async () => {
		const d = db();
		migrate(d, dir);
		const ins = (k: string) =>
			d.prepare('INSERT INTO rate_events (kind, ip_hash, at) VALUES (?, ?, ?)').bind('login', k, 1);
		await expect(d.batch([ins('a'), d.prepare('INSERT INTO nope VALUES (1)')])).rejects.toThrow();
		expect(await d.prepare('SELECT count(*) AS n FROM rate_events').first()).toEqual({ n: 0 });
	});
});

describe('migrate', () => {
	it('applies every migration once on a new file, without a backup', () => {
		const d = db();
		expect(migrate(d, dir)).toEqual({ applied: ['0001_init.sql'], backup: null });
		expect(names(d)).toEqual(['0001_init.sql']);
		expect(migrate(d, dir)).toEqual({ applied: [], backup: null });
	});
	it('backs up an existing file before applying a new migration', () => {
		const d = db();
		migrate(d, dir);
		addTestSite(d);
		writeFileSync(join(dir, '0002_extra.sql'), 'CREATE TABLE extra (id INTEGER PRIMARY KEY);');
		const r = migrate(d, dir);
		expect(r.applied).toEqual(['0002_extra.sql']);
		expect(r.backup).toBe(join(tmp, 'wlc.db.pre-0002_extra.bak'));
		expect(names(d)).toEqual(['0001_init.sql', '0002_extra.sql']);
		const copy = new DatabaseSync(r.backup!, { readOnly: true });
		expect(copy.prepare('SELECT count(*) AS n FROM sites').get()).toEqual({ n: 1 });
		expect(copy.prepare("SELECT name FROM sqlite_master WHERE name = 'extra'").get()).toBe(
			undefined
		);
		copy.close();
	});
	it('rolls back a failing migration and leaves the history alone', () => {
		const d = db();
		migrate(d, dir);
		writeFileSync(join(dir, '0002_bad.sql'), 'CREATE TABLE half (id INTEGER); SELECT * FROM nope;');
		expect(() => migrate(d, dir)).toThrow(/0002_bad\.sql failed and was rolled back/);
		expect(names(d)).toEqual(['0001_init.sql']);
		expect(d.sql.prepare("SELECT name FROM sqlite_master WHERE name = 'half'").get()).toBe(
			undefined
		);
		// A retry after fixing the file works, with its own backup name.
		writeFileSync(join(dir, '0002_bad.sql'), 'CREATE TABLE half (id INTEGER);');
		const r = migrate(d, dir);
		expect(r.applied).toEqual(['0002_bad.sql']);
		expect(r.backup).toMatch(/wlc\.db\.pre-0002_bad\.\d+\.bak$/);
	});
	it('refuses a file that holds other tables', () => {
		const d = db();
		d.sql.exec('CREATE TABLE customers (id INTEGER)');
		expect(() => migrate(d, dir)).toThrow(/no We Love Cookies migration history/);
		expect(d.sql.prepare("SELECT name FROM sqlite_master WHERE name = 'sites'").get()).toBe(
			undefined
		);
	});
	it('refuses a file migrated by a newer version', () => {
		const d = db();
		writeFileSync(join(dir, '0002_new.sql'), 'CREATE TABLE extra (id INTEGER);');
		migrate(d, dir);
		rmSync(join(dir, '0002_new.sql'));
		expect(() => migrate(d, dir)).toThrow(/does not know \(0002_new\.sql\)/);
	});
	it('runs the shipped migrations from the default folder', () => {
		const d = db();
		expect(migrate(d).applied).toContain('0001_init.sql');
	});
});

describe('backupTo', () => {
	it('writes a checked copy and never overwrites a file', () => {
		const d = db();
		migrate(d, dir);
		addTestSite(d);
		const target = join(tmp, 'copy.db');
		backupTo(d, target);
		expect(existsSync(target)).toBe(true);
		const copy = new DatabaseSync(target, { readOnly: true });
		expect(copy.prepare('SELECT count(*) AS n FROM sites').get()).toEqual({ n: 1 });
		copy.close();
		expect(() => backupTo(d, target)).toThrow(/already exists/);
	});
});
