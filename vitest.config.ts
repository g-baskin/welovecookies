import { defineConfig } from 'vitest/config';

// reference/ holds server code that needs a SvelteKit + Cloudflare D1 app to run.
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
