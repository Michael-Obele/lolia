// Capped stagger, the one formula motion.md allows for index delays:
// `min(i * step, cap)`. The cap belongs to the moment, so the last item's wait
// never grows with the number of items — element 119 does not lengthen ignition.
//
// The result is a CSS delay string, built here and not in a component: the
// components carry no duration literals at all, they only read the property.

export const staggers = {
	// 118 cells at 6 ms apart, capped at 640 ms inside the 900 ms show.
	ignition: { step: 6, cap: 640 },
	// The inspector's five field groups: 20 ms apart, 80 ms of spread at most.
	content: { step: 20, cap: 80 },
	// The shell diagram's electrons: 30 ms apart, stopping at 420 ms, so the
	// twenty-sixth of a heavy element lands with the fifteenth instead of a
	// second after the first.
	shell: { step: 30, cap: 420 }
} as const;

export type StaggerName = keyof typeof staggers;

/** The CSS delay for item `i`. Negative indices are the first item, not a bug. */
export function stagger(i: number, name: StaggerName): string {
	const { step, cap } = staggers[name];
	return `${Math.min(Math.max(i, 0) * step, cap)}ms`;
}
