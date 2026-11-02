import { describe, expect, test } from 'bun:test';
import { easing } from '../src/lib/motion/easing.ts';
import { easings } from '../src/lib/motion/tokens.ts';

// The second half of the duration pair D13a describes: `tokens.ts` gives
// layerchart a number of milliseconds, and this file gives it a d3 easing
// function. A token with no function would leave the chart tweening on a guess.

describe('easing functions', () => {
	test('every CSS easing token has a d3 function', () => {
		expect(Object.keys(easing).sort()).toEqual(Object.keys(easings).sort());
	});

	test('each one is a curve from 0 to 1', () => {
		for (const [name, fn] of Object.entries(easing)) {
			expect(fn(0), name).toBeCloseTo(0, 6);
			expect(fn(1), name).toBeCloseTo(1, 6);
		}
	});

	test('each one is monotonic, so a reveal never runs backwards', () => {
		for (const [name, fn] of Object.entries(easing)) {
			let previous = fn(0);
			for (let step = 1; step <= 100; step++) {
				const value = fn(step / 100);
				expect(value, `${name} at ${step / 100}`).toBeGreaterThanOrEqual(previous - 1e-9);
				previous = value;
			}
		}
	});

	test('out starts fast and in-out is symmetric, which is what the names promise', () => {
		expect(easing.out(0.25)).toBeGreaterThan(0.25);
		expect(easing['in-out'](0.25)).toBeCloseTo(1 - easing['in-out'](0.75), 6);
		expect(easing.linear(0.4)).toBeCloseTo(0.4, 6);
	});
});
