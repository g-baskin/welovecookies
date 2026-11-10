import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
	{
		ignores: [
			'dist/',
			'admin/public/',
			'admin/.wrangler/',
			'admin/node-dist/',
			'wordpress/welovecookies/assets/'
		]
	},
	js.configs.recommended,
	tseslint.configs.recommended,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: { '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }] }
	}
);
