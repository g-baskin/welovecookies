// The small part of D1 this Worker uses, so tests can run the same SQL on node:sqlite.
export interface Stmt {
	bind(...values: unknown[]): Stmt;
	first<T = Record<string, unknown>>(): Promise<T | null>;
	all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
	run(): Promise<{ meta: { changes: number } }>;
}
export interface Db {
	prepare(query: string): Stmt;
	/** Runs every statement in one transaction (D1 has no BEGIN/COMMIT). */
	batch(statements: Stmt[]): Promise<unknown[]>;
}

export interface Env {
	DB: Db;
	ADMIN_PASSWORD?: string;
	SESSION_SECRET?: string;
	/** Optional Workers rate-limit binding for the public endpoints (admin/wrangler.jsonc "ratelimits"). */
	PUBLIC_LIMITER?: { limit(o: { key: string }): Promise<{ success: boolean }> };
}

export const DAY_MS = 86_400_000;
export const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export interface SiteRow {
	key: string;
	name: string;
	origin: string;
	privacy_url: string;
	enabled: number;
	settings_json: string;
	rev: number;
	created_at: number;
	updated_at: number;
}

export const SITE_KEY_RE = /^ws_[A-Za-z0-9_-]{12}$/;

export async function getSite(db: Db, key: unknown): Promise<SiteRow | null> {
	if (typeof key !== 'string' || !SITE_KEY_RE.test(key)) return null;
	return db.prepare('SELECT * FROM sites WHERE key = ?').bind(key).first<SiteRow>();
}

export async function listSiteRows(db: Db): Promise<SiteRow[]> {
	return (await db.prepare('SELECT * FROM sites ORDER BY created_at, key').all<SiteRow>()).results;
}

/** The enabled site with this exact origin (preflights carry no body, so no site key). */
export async function enabledSiteByOrigin(db: Db, origin: string | null): Promise<SiteRow | null> {
	if (!origin) return null;
	return db
		.prepare('SELECT * FROM sites WHERE origin = ? AND enabled = 1')
		.bind(origin)
		.first<SiteRow>();
}
