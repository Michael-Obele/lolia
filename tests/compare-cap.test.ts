// The adaptive cap, held to its two behaviours: how many a screen holds, and what
// a tray collected on a wider screen does when it is opened on a narrower one.

import { describe, expect, test } from 'bun:test';
import {
	CAP_NARROW,
	CAP_WIDE,
	capFor,
	overflow,
	refusal,
	sanitize,
	TRAY_MAX,
	WIDE_QUERY
} from '../src/lib/components/compare/cap.ts';

describe('capFor', () => {
	test('four below the breakpoint, six at and above it', () => {
		expect(capFor(false)).toBe(4);
		expect(capFor(true)).toBe(6);
		expect(CAP_NARROW).toBe(4);
		expect(CAP_WIDE).toBe(6);
	});

	test('the breakpoint is the one the media query states', () => {
		// One number, read in one place: if the query moves, the cap moves with it.
		const px = Number(/min-width:\s*(\d+)px/.exec(WIDE_QUERY)?.[1]);
		expect(px).toBe(720);
		expect(WIDE_QUERY).toBe('(min-width: 720px)');
	});
});

describe('sanitize', () => {
	test('keeps known symbols in the order they were added', () => {
		expect(sanitize(['Fe', 'O', 'H'])).toEqual(['Fe', 'O', 'H']);
	});

	test('drops symbols this build does not know, and anything not a string', () => {
		expect(sanitize(['Fe', 'Xx', 7, null, { symbol: 'O' }])).toEqual(['Fe']);
	});

	test('collapses repeats to the first slot rather than showing a column twice', () => {
		expect(sanitize(['Fe', 'O', 'Fe'])).toEqual(['Fe', 'O']);
	});

	test('a tray stored beyond the widest cap is cut at that cap, not at this one', () => {
		const all = ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O'];
		const kept = sanitize(all);
		expect(kept).toHaveLength(TRAY_MAX);
		expect(kept).toEqual(all.slice(0, TRAY_MAX));
	});

	test('anything that is not an array is an empty tray', () => {
		expect(sanitize(null)).toEqual([]);
		expect(sanitize('Fe,O')).toEqual([]);
		expect(sanitize({ 0: 'Fe' })).toEqual([]);
	});
});

describe('overflow', () => {
	const collected = ['H', 'He', 'Li', 'Be', 'B', 'C'];

	test('a tray that fits hides nothing', () => {
		expect(overflow(collected.slice(0, 4), CAP_NARROW)).toBe(0);
		expect(overflow(collected, CAP_WIDE)).toBe(0);
	});

	test('six collected on a wide screen leaves two behind on a narrow one', () => {
		expect(overflow(collected, CAP_NARROW)).toBe(2);
		// What is shown is the first cap, in order — the tail is said out loud.
		expect(collected.slice(0, CAP_NARROW)).toEqual(['H', 'He', 'Li', 'Be']);
	});

	test('never negative', () => {
		expect(overflow([], CAP_NARROW)).toBe(0);
		expect(overflow(['H'], CAP_WIDE)).toBe(0);
	});
});

describe('refusal', () => {
	test('names the cap it was told, so the sentence cannot go stale', () => {
		expect(refusal(CAP_NARROW)).toContain('4 elements');
		expect(refusal(CAP_WIDE)).toContain('6 elements');
		expect(refusal(CAP_WIDE)).toContain('Remove one');
	});
});
