import { describe, expect, test } from 'bun:test';
import { durations, easings, springs } from '../src/lib/motion/tokens.ts';
import { names, valueOf } from './layout.ts';

// Brief §2, written out verbatim. Deliberately duplicated instead of imported: a
// test whose expectation is read from the code under test cannot notice a change
// to that code. These pin tokens.ts *and* layout.css to the same numbers.

const briefDurations: Record<string, number> = { instant: 90, fast: 140, base: 220, slow: 380, story: 900 };

const briefEasings: Record<string, string> = {
	out: 'cubic-bezier(0.16, 1, 0.3, 1)',
	'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
	linear: 'linear'
};

const briefSprings: Record<string, { stiffness: number; damping: number }> = {
	settle: { stiffness: 0.12, damping: 0.72 },
	pop: { stiffness: 0.2, damping: 0.55 },
	drag: { stiffness: 0.06, damping: 0.85 }
};

const cssDurations = new Map(
	names()
		.filter((name) => name.startsWith('dur-'))
		.map((name) => {
			const raw = valueOf(name);
			const match = /^(\d+(?:\.\d+)?)ms$/.exec(raw);
			if (!match) throw new Error(`--${name} is not a whole number of milliseconds: ${raw}`);
			return [name.slice('dur-'.length), Number(match[1])] as [string, number];
		})
);

const cssEasings = new Map(
	names()
		.filter((name) => name.startsWith('ease-'))
		.map((name) => [name.slice('ease-'.length), valueOf(name)] as [string, string])
);

describe('durations', () => {
	test('layout.css declares exactly the brief’s durations', () => {
		expect(Object.fromEntries(cssDurations)).toEqual(briefDurations);
	});

	test('tokens.ts agrees with layout.css', () => {
		expect(Object.keys(durations).sort()).toEqual([...cssDurations.keys()].sort());

		for (const [name, value] of Object.entries(durations)) {
			expect({ name, ms: cssDurations.get(name) }).toEqual({ name, ms: value.ms });
			expect(value.css).toBe(`${value.ms}ms`);
		}
	});

	test('tokens.ts agrees with the brief', () => {
		expect(Object.fromEntries(Object.entries(durations).map(([name, value]) => [name, value.ms]))).toEqual(
			briefDurations
		);
	});
});

describe('easings', () => {
	test('layout.css declares exactly the brief’s easings', () => {
		expect(Object.fromEntries(cssEasings)).toEqual(briefEasings);
	});

	test('tokens.ts agrees with layout.css', () => {
		expect(Object.keys(easings).sort()).toEqual([...cssEasings.keys()].sort());

		for (const [name, value] of Object.entries(easings)) {
			expect({ name, value: cssEasings.get(name) }).toEqual({ name, value });
		}
	});

	test('tokens.ts agrees with the brief', () => {
		const declared: Record<string, string> = { ...easings };
		expect(declared).toEqual(briefEasings);
	});
});

describe('springs', () => {
	test('every preset is the brief’s stiffness and damping pair', () => {
		const declared: Record<string, { stiffness: number; damping: number }> = { ...springs };
		expect(declared).toEqual(briefSprings);
	});

	test('every preset has both numbers', () => {
		for (const [name, preset] of Object.entries(springs)) {
			expect({ name, ...preset }).toMatchObject({
				stiffness: expect.any(Number),
				damping: expect.any(Number)
			});
		}
	});
});
