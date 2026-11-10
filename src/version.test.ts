import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const pick = (f: string, re: RegExp) => re.exec(read(f))?.[1];

describe('release version', () => {
	it('is the same in every place that states it', () => {
		const version = JSON.parse(read('package.json')).version as string;
		const lock = JSON.parse(read('package-lock.json'));
		const php = 'wordpress/welovecookies/welovecookies.php';
		expect(version).toMatch(/^\d+\.\d+\.\d+$/);
		expect({
			'package-lock.json version': lock.version,
			'package-lock.json packages[""].version': lock.packages[''].version,
			'welovecookies.php Version:': pick(php, /^ \* Version:\s+(\S+)$/m),
			'welovecookies.php WELOVECOOKIES_VERSION': pick(
				php,
				/define\(\s*'WELOVECOOKIES_VERSION',\s*'([^']+)'\s*\)/
			),
			'readme.txt Stable tag': pick('wordpress/welovecookies/readme.txt', /^Stable tag:\s*(\S+)$/m),
			'newest CHANGELOG.md release': pick('CHANGELOG.md', /^## \[(\d+\.\d+\.\d+)\]/m)
		}).toEqual({
			'package-lock.json version': version,
			'package-lock.json packages[""].version': version,
			'welovecookies.php Version:': version,
			'welovecookies.php WELOVECOOKIES_VERSION': version,
			'readme.txt Stable tag': version,
			'newest CHANGELOG.md release': version
		});
	});
});
