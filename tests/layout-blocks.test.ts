import { describe, expect, test } from 'bun:test';
import { block, blocks, css, parse } from './layout.ts';

// `block()` used to take the first match with `find()`. Appending a second
// `:root` to layout.css therefore passed every value pin while the browser
// honoured the *later* block — the same hole the pins exist to close, one level
// up. These tests hold the duplicate guard in place.

describe('block()', () => {
	test('the file declares every selector it uses exactly once', () => {
		const selectors = [...new Set(blocks.map((candidate) => candidate.selector))].sort();

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
