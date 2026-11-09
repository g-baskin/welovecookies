/** Test-only: a minimal cookie jar that behaves like SvelteKit's `Cookies` for the code under test. */
import type { Cookies } from '@sveltejs/kit';

export function cookieJar() {
	const store = new Map<string, string>();
	const options = new Map<string, Record<string, unknown>>();
	const cookies = {
		get: (name: string) => store.get(name),
		set: (name: string, value: string, opts: Record<string, unknown>) => {
			store.set(name, value);
			options.set(name, opts);
		},
		delete: (name: string) => {
			store.delete(name);
		}
	} as unknown as Cookies;
	return { cookies, store, options };
}
