// The compare rules that outlive a component: how many elements a screen can
// hold, what of a stored tray is actually shown, and the sentence a refusal
// earns. No runes here — `tray.svelte.ts` owns the state, this owns the rules,
// and the rules are the part a test can hold without a browser.

import { elements } from '#lib/data/elements.generated.ts';

/** Read once, at module load, by one listener. Never a resize handler. */
export const WIDE_QUERY = '(min-width: 720px)';

/** Below 720px four columns already need a sideways scroll. */
export const CAP_NARROW = 4;
/** At and above 720px the same table reads six. */
export const CAP_WIDE = 6;

/** How many symbols storage may hold, which is the widest cap, not this screen's. */
export const TRAY_MAX = CAP_WIDE;

export function capFor(wide: boolean): number {
	return wide ? CAP_WIDE : CAP_NARROW;
}

/**
 * Why an add did not happen. The cap moves with the width, so the number is
 * passed in rather than read from a constant that could be stale.
 */
export function refusal(cap: number): string {
	return `The compare tray holds ${cap} elements at this width. Remove one to add another.`;
}

const known = new Set(elements.map((element) => element.symbol));

/**
 * A stored tray is user intent from an older, possibly wider, screen. Symbols
 * this build does not know are dropped, repeats collapse to the first slot, and
 * the list is cut at the storage ceiling — never at the current cap, because a
 * narrow screen must not throw away what a wide one collected.
 */
export function sanitize(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	const kept: string[] = [];
	for (const value of raw) {
		if (typeof value === 'string' && known.has(value) && !kept.includes(value)) {
			kept.push(value);
		}
	}
	return kept.slice(0, TRAY_MAX);
}

/** The past-the-cap tail: what was collected and is not on screen here. */
export function overflow(symbols: string[], cap: number): number {
	return Math.max(0, symbols.length - cap);
}
