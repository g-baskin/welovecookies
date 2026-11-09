import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONSENT_ACTIONS, CONSENT_MODES, DEVICES } from './lib/consent/types.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const graph = join(root, 'library/knowledge/private/codebase-graph');

const walk = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.md') ? [join(dir, e.name)] : []
	);
const library = walk(join(root, 'library'));
const rel = (f: string) => relative(root, f);
const lineCount = (f: string) => readFileSync(f, 'utf8').replace(/\n$/, '').split('\n').length;

function frontmatter(text: string): Record<string, string[]> {
	const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
	const out: Record<string, string[]> = {};
	let key = '';
	for (const line of m ? m[1].split('\n') : []) {
		const kv = /^([A-Za-z_]+):\s*(.*)$/.exec(line);
		const item = /^\s+-\s+(.*)$/.exec(line);
		if (kv) {
			key = kv[1];
			const v = kv[2].trim();
			out[key] = v === '' || v === '[]' ? [] : v.startsWith('[') ? v.slice(1, -1).split(',') : [v];
		} else if (item && key) out[key].push(item[1]);
	}
	for (const k in out)
		out[k] = out[k].map((v) => v.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
	return out;
}

// `path`, `path:12`, `path:12-40` or `path:12,19`; returns a problem or null.
function checkCitation(cite: string): string | null {
	const m = /^([^:\s]+?)(?::(\d+(?:[-,]\d+)*))?$/.exec(cite);
	if (!m) return `unparseable citation "${cite}"`;
	const file = join(root, m[1]);
	if (relative(root, file).startsWith('..')) return `"${cite}" is outside the repo`;
	if (!existsSync(file) || !statSync(file).isFile()) return `missing file "${m[1]}"`;
	const max = Math.max(0, ...(m[2] ?? '').split(/[-,]/).filter(Boolean).map(Number));
	const lines = lineCount(file);
	return max > lines ? `"${cite}" is past the end of ${m[1]} (${lines} lines)` : null;
}

const stripCode = (text: string) => text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');

describe('library citations', () => {
	it('cite files and line ranges that exist', () => {
		const problems: string[] = [];
		for (const f of library) {
			const text = readFileSync(f, 'utf8');
			const fm = frontmatter(text);
			const cites = [...(fm.path ?? []), ...(fm.sources ?? []), ...(fm.tested_by ?? [])];
			// Backticked `dir/file.ext:12` style references in the page body.
			for (const m of text.matchAll(
				/`((?:src|admin|tools|wordpress|docs|demo)\/[^`\s:]+:\d+(?:[-,]\d+)*)`/g
			))
				cites.push(m[1]);
			for (const c of cites) {
				const p = checkCitation(c);
				if (p) problems.push(`${rel(f)}: ${p}`);
			}
		}
		expect(problems).toEqual([]);
	});

	it('give every source module an entity page', () => {
		const cited = new Set(
			walk(join(graph, 'entities')).flatMap((f) => {
				const fm = frontmatter(readFileSync(f, 'utf8'));
				return [...(fm.path ?? []), ...(fm.sources ?? [])].map((c) => c.split(':')[0]);
			})
		);
		const code = (dir: string, ext: RegExp): string[] =>
			readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
				e.isDirectory()
					? code(`${dir}/${e.name}`, ext)
					: ext.test(e.name) && !e.name.includes('.test.')
						? [`${dir}/${e.name}`]
						: []
			);
		const modules = [
			...code('src/lib/consent', /\.(ts|svelte)$/),
			...code('admin/src', /\.ts$/),
			...code('tools', /\.mjs$/)
		];
		expect(modules.filter((m) => !cited.has(m))).toEqual([]);
	});

	it('wiki links point at pages in codebase-graph', () => {
		const problems: string[] = [];
		for (const f of library) {
			const text = readFileSync(f, 'utf8');
			const fm = frontmatter(text);
			const links = [...stripCode(text).matchAll(/\[\[([^\]|#]+)/g)].map((m) => m[1]);
			for (const k of ['depends_on', 'used_by', 'related'])
				for (const v of fm[k] ?? []) links.push(v.replace(/^\[\[|\]\]$/g, ''));
			for (const l of links)
				if (!existsSync(join(graph, `${l.trim()}.md`))) problems.push(`${rel(f)}: [[${l}]]`);
		}
		expect(problems).toEqual([]);
	});
});

describe('relative Markdown links', () => {
	it('resolve to files in the repo', () => {
		const docs = [
			...['README.md', 'CHANGELOG.md', 'CONTEXT.md', 'src/lib/consent/README.md'].map((f) =>
				join(root, f)
			),
			...walk(join(root, 'docs')),
			...library
		];
		const problems: string[] = [];
		for (const f of docs) {
			for (const m of stripCode(readFileSync(f, 'utf8')).matchAll(
				/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
			)) {
				const target = m[1].replace(/^<|>$/g, '').split('#')[0];
				if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
				if (!existsSync(resolve(dirname(f), decodeURI(target))))
					problems.push(`${rel(f)} -> ${m[1]}`);
			}
		}
		expect(problems).toEqual([]);
	});
});

describe('docs/api/openapi.json', () => {
	const spec = JSON.parse(readFileSync(join(root, 'docs/api/openapi.json'), 'utf8'));
	const schemas = spec.components.schemas;

	it('documents the hosted endpoints', () => {
		expect(spec.openapi).toMatch(/^3\.1\./);
		expect(Object.keys(spec.paths)).toEqual(
			expect.arrayContaining(['/api/consent/config', '/api/consent', '/api/consent/seen'])
		);
	});

	it('keeps the mode, action and device enums equal to the code', () => {
		expect(schemas.ConsentMode.enum).toEqual([...CONSENT_MODES]);
		expect(schemas.ConsentAction.enum).toEqual([...CONSENT_ACTIONS]);
		expect(schemas.Device.enum).toEqual([...DEVICES]);
	});
});
