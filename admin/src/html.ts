// Server-rendered HTML: every interpolated value is escaped unless it is already Html.
export class Html {
	constructor(readonly s: string) {}
	toString() {
		return this.s;
	}
}

export const esc = (s: string) =>
	s.replace(
		/[&<>"'`]/g,
		(c) =>
			({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' })[c] ??
			c
	);

function render(v: unknown): string {
	if (v === null || v === undefined || v === false) return '';
	if (v instanceof Html) return v.s;
	if (Array.isArray(v)) return v.map(render).join('');
	return esc(String(v));
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): Html {
	let out = strings[0];
	for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
	return new Html(out);
}

/** Trusted markup only (never visitor or owner text). */
export const raw = (s: string) => new Html(s);

const SECURITY_HEADERS: Record<string, string> = {
	'content-type': 'text/html; charset=utf-8',
	'cache-control': 'private, no-store',
	'content-security-policy':
		"default-src 'none'; style-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'same-origin',
	'x-frame-options': 'DENY'
};

export function htmlResponse(body: Html, status = 200, headers: Record<string, string> = {}) {
	return new Response(`<!doctype html>${body.s}`, {
		status,
		headers: { ...SECURITY_HEADERS, ...headers }
	});
}

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
	new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json',
			'cache-control': 'private, no-store',
			...headers
		}
	});

export const redirect = (location: string, headers: Record<string, string> = {}) =>
	new Response(null, {
		status: 303,
		headers: { location, 'cache-control': 'no-store', ...headers }
	});

/** A public page (privacy request form) or the sign-in page. */
export function plainPage(title: string, body: Html): Html {
	return html`<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><link rel="stylesheet" href="/wlc.css"></head><body class="plain"><main>${body}</main></body></html>`;
}

export const CSS = `
:root{--bg:#f8fafc;--fg:#0f172a;--muted:#64748b;--line:#e2e8f0;--card:#fff;--primary:#1d4ed8;--bad:#b91c1c;--ok:#15803d;--warn:#a16207}
*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--fg)}
a{color:var(--primary)}main{max-width:1040px;margin:0 auto;padding:24px 16px 64px}.plain main{max-width:560px}
header.top{background:#0f172a;color:#fff}header.top .in{max-width:1040px;margin:0 auto;padding:10px 16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
header.top a{color:#e2e8f0;text-decoration:none;padding:4px 2px}header.top a[aria-current=page]{color:#fff;border-bottom:2px solid #fff}
header.top .brand{font-weight:700;color:#fff;margin-right:8px}header.top form{margin-left:auto}
h1{font-size:1.6rem;margin:8px 0 16px}h2{font-size:1.2rem;margin:24px 0 8px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;margin:12px 0}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}
.stat b{display:block;font-size:1.6rem}.stat span{color:var(--muted);font-size:.9rem}
table{width:100%;border-collapse:collapse;background:var(--card)}th,td{text-align:left;padding:8px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:.85rem;color:var(--muted);font-weight:600}
label{display:block;font-weight:600;margin:12px 0 4px}label.inline{display:flex;gap:8px;align-items:center;font-weight:400;margin:8px 0}
input[type=text],input[type=email],input[type=password],input[type=url],input[type=date],input:not([type]),select,textarea{width:100%;max-width:560px;padding:8px 10px;border:1px solid #94a3b8;border-radius:6px;font:inherit;background:#fff;color:inherit}
textarea{min-height:90px}textarea.code{font-family:ui-monospace,Menlo,monospace;font-size:.85rem;min-height:70px}
button,.button{display:inline-block;padding:8px 14px;border-radius:6px;border:1px solid var(--primary);background:var(--primary);color:#fff;font:inherit;font-weight:600;cursor:pointer;text-decoration:none}
button.secondary,.button.secondary{background:#fff;color:var(--primary)}button.danger{background:var(--bad);border-color:var(--bad)}
header.top button{background:transparent;border-color:#64748b;padding:4px 10px}
.sitebar{background:#fff;border-bottom:1px solid var(--line)}.sitebar .in{max-width:1040px;margin:0 auto;padding:8px 16px}.sitebar form{justify-content:flex-end}.sitebar label{margin:0}.sitebar select{width:auto;padding:4px 8px}.sitebar button{padding:4px 12px}
:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}
.muted{color:var(--muted)}.small{font-size:.875rem}.row{display:flex;gap:8px;flex-wrap:wrap;align-items:end}
.msg{padding:10px 12px;border-radius:8px;margin:12px 0}.msg.ok{background:#dcfce7;color:#14532d}.msg.err{background:#fee2e2;color:#7f1d1d}
.tag{display:inline-block;padding:1px 8px;border-radius:99px;font-size:.8rem;background:#e2e8f0}.tag.fix{background:#fee2e2;color:#7f1d1d}.tag.check{background:#fef9c3;color:#713f12}.tag.ok{background:#dcfce7;color:#14532d}
.hp{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}
code{background:#e2e8f0;padding:1px 5px;border-radius:4px;font-size:.9em;word-break:break-all}
fieldset{border:1px solid var(--line);border-radius:8px;margin:12px 0;padding:8px 12px}legend{font-weight:600}
`;
