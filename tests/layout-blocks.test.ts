import { describe, expect, test } from 'bun:test';
import { block, blocks, css, parse } from './layout.ts';

// `block()` used to take the first match with `find()`. Appending a second
// `:root` to layout.css therefore passed every value pin while the browser
// honoured the *later* block — the same hole the pins exist to close, one level
// up. These tests hold the duplicate guard in place.

describe('block()', () => {
	test('the file declares every token block it uses exactly once', () => {
		// Only blocks that declare custom properties are token blocks. layout.css
		// also carries the `@media print` rules from task 6, which declare none, so
		// they are not part of this list — the guard below is about a token
		// appearing twice with the later block silently winning.
		const selectors = [
			...new Set(
				blocks.filter((candidate) => candidate.values.size > 0).map((candidate) => candidate.selector)
			)
		].sort();

		expect(selectors).toEqual(['.dark', ':root', '@theme', '@theme inline']);

		for (const selector of selectors) {
			expect({ selector, count: blocks.filter((each) => each.selector === selector).length }).toEqual({
				selector,
				count: 1
			});
		}
	});

	test('a duplicate block is fatal, not silently resolved to the first', () => {
		// The exact move the guard exists for: a trailing :root that redefines a
		// category hue with a still-valid hex.
		const duplicated = parse(`${css}\n:root {\n\t--cat-nonmetal: #ff0000;\n}\n`);

		expect(() => block(':root', duplicated)).toThrow('layout.css declares `:root` 2 times');
	});

	test('a missing block is fatal', () => {
		expect(() => block(':nope')).toThrow('layout.css has no `:nope` block');
	});
});
