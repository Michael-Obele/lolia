import { describe, expect, test } from 'bun:test';
import { block, declaredIn, names, valueOf } from './layout.ts';

// The drift test in the brief only proved tokens *exist*. A token that exists
// with the wrong value is worse than a missing one, because every utility keeps
// resolving to something and nothing looks broken. So each row of the brief's
// table is pinned here, value for value.

const baseColors = {
	':root': {
		bg: '#f7f3ed',
		surface: '#fffcf7',
		'surface-raised': '#ffffff',
		line: '#e2d8cc',
		ink: '#191310',
		'ink-dim': '#6b5f55',
		'ink-faint': '#9a8d82'
	},
	'.dark': {
		bg: '#161110',
		surface: '#211b18',
		'surface-raised': '#2a2220',
		line: '#3a302b',
		ink: '#f6ede2',
		'ink-dim': '#a99c90',
		'ink-faint': '#6e635b'
	}
};

const categoryHues = {
	'cat-alkali': '#f2c14e',
	'cat-alkaline-earth': '#c9d45c',
	'cat-transition': '#4f7de0',
	'cat-post-transition': '#9c86e0',
	'cat-metalloid': '#6fa8a0',
	'cat-nonmetal': '#5fbf7f',
	'cat-noble-gas': '#b77bd6',
	'cat-lanthanide': '#4fb8c9',
	'cat-actinide': '#e08a4f',
	'cat-unknown': '#8a8578'
};

const typeScale = {
	'text-xs': '0.75rem',
	'text-sm': '0.875rem',
	'text-base': '1rem',
	'text-lg': '1.25rem',
	'text-xl': '1.5rem',
	'text-2xl': '2rem',
	'text-3xl': '3rem',
	'text-display': '6rem'
};

const fontStacks = {
	'font-display': 'Archivo, ui-sans-serif, system-ui, sans-serif',
	'font-prose': 'Newsreader, ui-serif, Georgia, serif',
	'font-data': '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace'
};

const radiusScale = {
	'radius-sm': 'calc(var(--radius) - 4px)',
	'radius-md': 'calc(var(--radius) - 2px)',
	'radius-lg': 'var(--radius)',
	'radius-xl': 'calc(var(--radius) + 4px)'
};

const chartAliases = {
	'chart-1': 'var(--cat-transition)',
	'chart-2': 'var(--cat-noble-gas)',
	'chart-3': 'var(--cat-lanthanide)',
	'chart-4': 'var(--cat-actinide)',
	'chart-5': 'var(--cat-alkali)'
};

/** Quotes and comma spacing differ harmlessly; the stack itself must not. */
const stack = (fonts: string) => fonts.replace(/["']/g, '').replace(/\s*,\s*/g, ',').trim();

describe('base colours', () => {
	for (const [selector, expected] of Object.entries(baseColors)) {
		test(`${selector} holds the brief’s seven values`, () => {
			const declared = block(selector).values;

			for (const [name, value] of Object.entries(expected)) {
				expect({ selector, name, value: declared.get(name) }).toEqual({ selector, name, value });
			}
		});
	}
});

describe('category hues', () => {
	test('all ten match the brief', () => {
		const declared = block(':root').values;

		expect([...declared.keys()].filter((name) => name.startsWith('cat-')).sort()).toEqual(
			Object.keys(categoryHues).sort()
		);

		for (const [name, value] of Object.entries(categoryHues)) {
			expect({ name, value: declared.get(name) }).toEqual({ name, value });
		}
	});

	test('both themes share them, because they are data rather than chrome', () => {
		const darkDeclares = [...block('.dark').values.keys()].filter((name) => name.startsWith('cat-'));

		expect(darkDeclares).toEqual([]);
	});
});

describe('type scale', () => {
	test('all eight steps match the brief', () => {
		for (const [name, value] of Object.entries(typeScale)) {
			expect({ name, value: valueOf(name) }).toEqual({ name, value });
		}
	});

	test('every step is registered in @theme, so `text-*` emits the design’s size', () => {
		// Tailwind v4 discovers the `--text-*` namespace from @theme alone. Left in
		// `:root`, `text-2xl` silently keeps Tailwind’s own 1.5rem instead.
		for (const name of Object.keys(typeScale)) {
			expect({ name, blocks: declaredIn(name) }).toEqual({ name, blocks: ['@theme'] });
		}
	});

	test('display sets a line-height of 1', () => {
		expect(valueOf('text-display--line-height')).toBe('1');
	});
});

describe('font stacks', () => {
	test('all three match the brief', () => {
		for (const [name, value] of Object.entries(fontStacks)) {
			expect({ name, stack: stack(valueOf(name)) }).toEqual({ name, stack: stack(value) });
		}
	});

	test('every stack is registered in @theme, so `font-*` emits at all', () => {
		for (const name of Object.keys(fontStacks)) {
			expect({ name, blocks: declaredIn(name) }).toEqual({ name, blocks: ['@theme'] });
		}
	});
});

describe('radius', () => {
	test('the design’s 0.625rem, not Tailwind’s 0.375rem', () => {
		expect(valueOf('radius')).toBe('0.625rem');
	});

	test('the rounded-* scale is derived from it and inlined', () => {
		for (const [name, value] of Object.entries(radiusScale)) {
			expect({ name, value: valueOf(name), blocks: declaredIn(name) }).toEqual({
				name,
				value,
				blocks: ['@theme inline']
			});
		}
	});
});

describe('chart aliases', () => {
	test('shadcn’s var(--chart-N) resolves onto the category hues', () => {
		const declared = block(':root').values;

		for (const [name, value] of Object.entries(chartAliases)) {
			expect({ name, value: declared.get(name) }).toEqual({ name, value });
			expect(declaredIn(name)).toEqual([':root']);
		}
	});
});

describe('token inventory', () => {
	test('nothing in the shared namespaces is left where it emits no utility', () => {
		// `--dur-*` is the one exception: Tailwind has no `--duration-*` namespace,
		// so there is no utility to generate and `duration-(--dur-fast)` is the
		// idiom instead.
		const stranded = names()
			.filter((name) => /^(color|font|text|ease|radius|shadow|spacing|breakpoint|animate)-/.test(name))
			.filter((name) => declaredIn(name).every((selector) => !selector.startsWith('@theme')));

		expect(stranded).toEqual([]);
	});
});
