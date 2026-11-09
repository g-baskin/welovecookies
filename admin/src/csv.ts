// CSV for spreadsheets. Cells that a spreadsheet would run as a formula get a leading apostrophe.
export function csvCell(v: unknown): string {
	let s = v === null || v === undefined ? '' : String(v);
	if (/^[\s\u3000]*[=+\-@|%\uFF1D\uFF0B\uFF0D\uFF20]/.test(s) || /^[\t\r]/.test(s)) s = `'${s}`;
	return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** UTF-8 with a byte-order mark so Excel reads accents correctly; CRLF line ends. */
export function toCsv(header: readonly string[], rows: readonly (readonly unknown[])[]): string {
	return `\uFEFF${[header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
