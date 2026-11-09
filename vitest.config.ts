import { defineConfig } from 'vitest/config';

// reference/ holds store-specific code that needs the ecom-bliss app to run.
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
