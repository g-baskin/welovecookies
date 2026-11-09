// Test-only D1 stand-in: the real migration on an in-memory node:sqlite database.
import { readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { Db, Stmt } from './db.ts';

const MIGRATIONS = ['0001_init.sql'].map((f) =>
	readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8')
);

export function testDb(): Db & { sql: DatabaseSync } {
	const sql = new DatabaseSync(':memory:');
	sql.exec('PRAGMA foreign_keys = ON');
	for (const m of MIGRATIONS) sql.exec(m);
	const stmt = (q: string, args: SQLInputValue[] = []): Stmt & { exec(): number } => ({
		bind: (...v: unknown[]) => stmt(q, v as SQLInputValue[]),
		first: async <T>() => (sql.prepare(q).get(...args) as T | undefined) ?? null,
		all: async <T>() => ({ results: sql.prepare(q).all(...args) as T[] }),
		run: async () => ({ meta: { changes: Number(sql.prepare(q).run(...args).changes) } }),
		exec: () => Number(sql.prepare(q).run(...args).changes)
	});
	return {
		sql,
		prepare: (q) => stmt(q),
		async batch(list) {
			sql.exec('BEGIN');
			try {
				const out = list.map((s) => (s as ReturnType<typeof stmt>).exec());
				sql.exec('COMMIT');
				return out;
			} catch (e) {
				sql.exec('ROLLBACK');
				throw e;
			}
		}
	};
}

export const TEST_KEY = 'ws_abcDEF123_-x';
export const TEST_ORIGIN = 'https://example.com';

export function addTestSite(
	db: ReturnType<typeof testDb>,
	o: {
		key?: string;
		origin?: string;
		enabled?: number;
		settings?: object;
		privacyUrl?: string;
		createdAt?: number;
	} = {}
) {
	const now = o.createdAt ?? Date.now();
	db.sql
		.prepare(
			'INSERT INTO sites (key, name, origin, privacy_url, enabled, settings_json, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)'
		)
		.run(
			o.key ?? TEST_KEY,
			'Example',
			o.origin ?? TEST_ORIGIN,
			o.privacyUrl ?? 'https://example.com/privacy',
			o.enabled ?? 1,
			JSON.stringify(o.settings ?? {}),
			now,
			now
		);
	return o.key ?? TEST_KEY;
}
