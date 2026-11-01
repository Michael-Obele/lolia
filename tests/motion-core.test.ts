import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { stagger, staggers } from '../src/lib/motion/stagger.ts';

// The motion core's two rules that a unit test can hold: the stagger is capped,
// and reduced motion goes through exactly one gate. Everything else in the
// motion spec is a rendered-frame question and is proved in the browser.

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return walk(path);
		return [path];
	});
}

const files = walk(SRC).filter((path) => /\.(ts|svelte)$/.test(path));

function read(path: string): string {
	return readFileSync(path, 'utf8');
}

/** `min(i * step, cap)` written out, so the helper cannot quietly drift. */
function capped(i: number, step: number, cap: number): string {
	return `${Math.min(i * step, cap)}ms`;
}

describe('capped stagger', () => {
	test('the first item starts at zero', () => {
		expect(stagger(0, 'ignition')).toBe('0ms');
		expect(stagger(0, 'content')).toBe('0ms');
	});

	test('ignition is 6 ms per element and caps at 640 ms', () => {
		expect(stagger(1, 'ignition')).toBe(capped(1, 6, 640));
		expect(stagger(10, 'ignition')).toBe('60ms');
		// Element 119, and everything after it, waits exactly as long as the cap.
		expect(stagger(118, 'ignition')).toBe('640ms');
		expect(stagger(1000, 'ignition')).toBe('640ms');
		expect(stagger(Number.MAX_SAFE_INTEGER, 'ignition')).toBe('640ms');
	});

	test('no element ever waits longer than the cap, at any count', () => {
		const { step, cap } = staggers.ignition;
		for (let i = 0; i < 1000; i++) {
			const ms = Number(stagger(i, 'ignition').replace('ms', ''));
			expect(ms).toBe(Math.min(i * step, cap));
			expect(ms).toBeLessThanOrEqual(cap);
		}
	});

	test('the delay never decreases with the index', () => {
		let previous = -1;
		for (let i = 0; i < 200; i++) {
			const ms = Number(stagger(i, 'ignition').replace('ms', ''));
			expect(ms).toBeGreaterThanOrEqual(previous);
			previous = ms;
		}
	});

	test('a negative index is the first item, not a negative delay', () => {
		expect(stagger(-1, 'content')).toBe('0ms');
		expect(stagger(-99, 'ignition')).toBe('0ms');
	});

	test('the inspector groups spread 20 ms apart and stop at the cap', () => {
		const delays = [0, 1, 2, 3, 4].map((i) => stagger(i, 'content'));
		expect(delays).toEqual(['0ms', '20ms', '40ms', '60ms', '80ms']);
		// Five groups is the panel that exists; the cap is the guard for a longer one.
		expect(stagger(50, 'content')).toBe(capped(50, 20, 80));
	});
});

describe('reduced motion gate', () => {
	test('motionOk() is the only reader of the OS preference', () => {
		const readers = files
			.filter((path) => read(path).includes('prefersReducedMotion'))
			.map((path) => relative(SRC, path));
		expect(readers).toEqual([join('lib', 'motion', 'reduced.ts')]);
	});

	test('no component asks the media query itself', () => {
		const offenders = files
			.filter((path) => /matchMedia\([^)]*reduced/i.test(read(path)))
			.map((path) => relative(SRC, path));
		expect(offenders).toEqual([]);
	});
});

describe('durations come from the token layer', () => {
	test('no component writes a duration literal', () => {
		const components = files.filter((path) => path.includes(`${join('lib', 'components')}`));
		const offenders = components
			.filter((path) => /[0-9]+(\.[0-9]+)?m?s\b/.test(read(path)) && /[0-9.]+ms\b/.test(read(path)))
			.map((path) => relative(SRC, path));
		expect(offenders).toEqual([]);
	});

	test('the ignition flag is one key, spelled the same in the grid and in settings', () => {
		const grid = read(join(SRC, 'lib', 'components', 'table', 'Grid.svelte'));
		const settings = read(join(SRC, 'lib', 'components', 'settings', 'SettingsDialog.svelte'));
		expect(grid).toContain("'lolia.ignited'");
		expect(settings).toContain("'lolia.ignited'");
	});
});
