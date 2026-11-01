import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { categorySlugs, categoryVar } from '../src/lib/design/category.ts';
import { valueOf } from './layout.ts';

// category.ts is the bridge between the data's slugs and the CSS hues. If a slug
// is renamed upstream, or a token is renamed in layout.css, this has to fail
// rather than quietly paint every cell the same colour.

const types = readFileSync(new URL('../src/lib/data/types.ts', import.meta.url), 'utf8');

describe('category slugs', () => {
	test('the map covers ElementCategory exactly', () => {
		const at = types.indexOf('export type ElementCategory');
		const declaration = types.slice(at, types.indexOf(';', at));
		const fromType = [...declaration.matchAll(/'([a-z-]+)'/g)].map(([, slug]) => slug);

		expect<string[]>([...categorySlugs].sort()).toEqual(fromType.sort());
	});

	test('every slug resolves to a var(--cat-…) that layout.css defines', () => {
		expect(categorySlugs).toHaveLength(10);

		for (const slug of categorySlugs) {
			const reference = categoryVar(slug);
			expect({ slug, reference }).toEqual({ slug, reference: expect.stringMatching(/^var\(--cat-[a-z-]+\)$/) });

			const token = reference.slice('var('.length, -1);
			expect({ slug, value: valueOf(token.slice('--'.length)) }).toEqual({
				slug,
				value: expect.stringMatching(/^#[0-9a-f]{6}$/i)
			});
		}
	});
});
