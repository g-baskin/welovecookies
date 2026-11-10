// Serve the repo on http://localhost:4173 (or $PORT) so demo/ can load dist/ (cookies need http, not file://).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve('.');
// PORT lets npm run test:local serve its fresh copy beside a demo that is already running.
const port = Number(process.env.PORT) || 4173;
/** @type {Record<string, string>} */
const types = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.mjs': 'text/javascript',
	'.jpg': 'image/jpeg',
	'.png': 'image/png'
};
createServer(async (req, res) => {
	const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
	const file = normalize(join(root, path.endsWith('/') ? `${path}index.html` : path));
	if (
		!file.startsWith(root + '/') ||
		!(file.includes('/demo/') || file.includes('/dist/') || file.includes('/docs/assets/'))
	) {
		res.writeHead(404).end('Not found');
		return;
	}
	try {
		const body = await readFile(file);
		res
			.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' })
			.end(body);
	} catch {
		res.writeHead(404).end('Not found');
	}
}).listen(port, '127.0.0.1', () => console.log(`Demo: http://localhost:${port}/demo/`));
