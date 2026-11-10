// npm run screenshots: the normal browser tests, plus the specs save the docs screenshots.
import { defineConfig } from '@playwright/test';
import base from '../playwright.config.ts';

export default defineConfig(base, { metadata: { screenshots: true } });
