// Test-only D1 stand-in: the real migrations on an in-memory node:sqlite database (same code as self-hosting).
import { migrate, openSqlite, type SqliteDb } from './sqlite.ts';

export function testDb(): SqliteDb {
	const db = openSqlite(':memory:');
	migrate(db);
	return db;
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
