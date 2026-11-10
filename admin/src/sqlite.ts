// SQLite (node:sqlite) behind the same Db interface as D1: the self-hosted admin and the tests both use it.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { Db, Stmt } from './db.ts';

export type SqliteDb = Db & { sql: DatabaseSync; path: string; close(): void };

// Resolves to admin/migrations from both admin/src/ and the bundled admin/node-dist/.
export const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations/', import.meta.url));
const MIGRATION_RE = /^\d{4}_[a-z0-9_]+\.sql$/;

export function openSqlite(path: string): SqliteDb {
	const sql = new DatabaseSync(path);
	// One writer process (docs/ADMIN-SELF-HOSTED.md); readers like the backup command never block it.
	sql.exec('PRAGMA journal_mode = WAL');
	sql.exec('PRAGMA busy_timeout = 5000');
	sql.exec('PRAGMA foreign_keys = ON');
	const stmt = (q: string, args: SQLInputValue[] = []): Stmt & { exec(): number } => ({
		bind: (...v: unknown[]) => stmt(q, v as SQLInputValue[]),
		first: async <T>() => (sql.prepare(q).get(...args) as T | undefined) ?? null,
		all: async <T>() => ({ results: sql.prepare(q).all(...args) as T[] }),
		run: async () => ({ meta: { changes: Number(sql.prepare(q).run(...args).changes) } }),
		exec: () => Number(sql.prepare(q).run(...args).changes)
	});
	return {
		sql,
		path,
		prepare: (q) => stmt(q),
		// Synchronous inside, so no other request can interleave with the transaction.
		async batch(list) {
			sql.exec('BEGIN IMMEDIATE');
			try {
				const out = list.map((s) => (s as ReturnType<typeof stmt>).exec());
				sql.exec('COMMIT');
				return out;
			} catch (e) {
				sql.exec('ROLLBACK');
				throw e;
			}
		},
		close: () => sql.close()
	};
}

/** A consistent copy of the live database (safe while the server runs), checked before returning. */
export function backupTo(db: SqliteDb, target: string) {
	if (existsSync(target)) throw new Error(`Backup not written: ${target} already exists.`);
	db.sql.prepare('VACUUM INTO ?').run(target);
	const copy = new DatabaseSync(target, { readOnly: true });
	try {
		const ok = copy.prepare('PRAGMA quick_check').get() as { quick_check?: string } | undefined;
		if (ok?.quick_check !== 'ok') throw new Error(`Backup ${target} failed its integrity check.`);
	} finally {
		copy.close();
	}
}

export interface MigrateResult {
	applied: string[];
	backup: string | null;
}

/** Applies pending migrations in name order, each in a transaction; backs up an existing file first. */
export function migrate(db: SqliteDb, dir = MIGRATIONS_DIR): MigrateResult {
	const files = readdirSync(dir)
		.filter((f) => MIGRATION_RE.test(f))
		.sort();
	const tables = (
		db.sql
			.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
			.all() as { name: string }[]
	).map((t) => t.name);
	const tracked = tables.includes('wlc_migrations');
	if (!tracked && tables.length > 0)
		throw new Error(
			`${db.path} already has tables (${tables.slice(0, 5).join(', ')}) but no We Love Cookies migration history. Use a new database file.`
		);
	const done = tracked
		? (db.sql.prepare('SELECT name FROM wlc_migrations').all() as { name: string }[]).map(
				(r) => r.name
			)
		: [];
	const unknown = done.filter((n) => !files.includes(n));
	if (unknown.length)
		throw new Error(
			`${db.path} has migrations this version does not know (${unknown.join(', ')}). It was used by a newer version; run that version or restore a backup.`
		);
	const pending = files.filter((f) => !done.includes(f));
	if (!pending.length) return { applied: [], backup: null };

	let backup: string | null = null;
	if (done.length && db.path !== ':memory:') {
		const base = `${db.path}.pre-${pending[0].replace(/\.sql$/, '')}`;
		backup = existsSync(`${base}.bak`) ? `${base}.${Date.now()}.bak` : `${base}.bak`;
		backupTo(db, backup);
	}
	db.sql.exec(
		'CREATE TABLE IF NOT EXISTS wlc_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)'
	);
	for (const name of pending) {
		const text = readFileSync(join(dir, name), 'utf8');
		db.sql.exec('BEGIN IMMEDIATE');
		try {
			db.sql.exec(text);
			db.sql
				.prepare('INSERT INTO wlc_migrations (name, applied_at) VALUES (?, ?)')
				.run(name, Date.now());
			db.sql.exec('COMMIT');
		} catch (e) {
			db.sql.exec('ROLLBACK');
			throw new Error(
				`Migration ${name} failed and was rolled back: ${e instanceof Error ? e.message : e}`,
				{ cause: e }
			);
		}
	}
	return { applied: pending, backup };
}
