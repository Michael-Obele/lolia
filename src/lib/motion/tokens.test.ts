import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { categorySlugs, categoryVar } from '../design/category.ts';
import { durations, easings, springs } from './tokens.ts';

// This test exists to fail when layout.css and the TypeScript tokens disagree.
// Both files are read as text: what ships is what is checked.

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../../routes/layout.css');
const types = read('../data/types.ts');

function cssDurations(): Map<string, number> {
	const found = new Map<string, number>();
	for (const [, name, value] of css.matchAll(/--dur-([a-z-]+):\s*(\d+(?:\.\d+)?)ms/g)) {
		found.set(name, Number(value));
	}
	return found;
}

function cssEasings(): Map<string, string> {
	return new Map(
		[...css.matchAll(/--ease-([a-z-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()])
	);
}

describe('motion tokens', () => {
	test('every duration matches layout.css', () => {
		const declared = cssDurations();
		expect([...declared.keys()].sort()).toEqual(Object.keys(durations).sort());

		for (const [name, value] of Object.entries(durations)) {
			expect({ name, ms: declared.get(name) }).toEqual({ name, ms: value.ms });
			expect(value.css).toBe(`${value.ms}ms`);
		}
	});

	test('every easing matches layout.css', () => {
		const declared = cssEasings();
		expect([...declared.keys()].sort()).toEqual(Object.keys(easings).sort());

		for (const [name, value] of Object.entries(easings)) {
			expect({ name, value: declared.get(name) }).toEqual({ name, value });
		}
	});

	test('every spring preset has stiffness and damping', () => {
		for (const [name, preset] of Object.entries(springs)) {
			expect({ name, ...preset }).toMatchObject({
				stiffness: expect.any(Number),
				damping: expect.any(Number)
			});
		}
	});
});

describe('category tokens', () => {
	test('the ten slugs match ElementCategory exactly', () => {
		const at = types.indexOf('export type ElementCategory');
		const declaration = types.slice(at, types.indexOf(';', at));
		const fromType = [...declaration.matchAll(/'([a-z-]+)'/g)].map(([, slug]) => slug);

		expect<string[]>([...categorySlugs].sort()).toEqual(fromType.sort());
	});

	test('every slug resolves to a hue token that layout.css defines', () => {
		expect(categorySlugs).toHaveLength(10);

		for (const slug of categorySlugs) {
			const reference = categoryVar(slug);
			expect({ slug, reference }).toEqual({ slug, reference: expect.stringMatching(/^var\(--cat-[a-z-]+\)$/) });

			const token = reference.slice('var('.length, -1);
			const value = new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1];
			expect({ slug, value }).toEqual({ slug, value: expect.stringMatching(/^#[0-9a-f]{6}$/i) });
		}
	});
});
