// The motion source of truth. Every duration exists twice on purpose: CSS reads
// the string, layerchart's `motion` prop reads the number. tokens.test.ts holds
// these and layout.css to the same values.

function duration(ms: number) {
	return { ms, css: `${ms}ms` } as const;
}

export const durations = {
	instant: duration(90),
	fast: duration(140),
	base: duration(220),
	slow: duration(380),
	story: duration(900)
} as const;

// Keys are the CSS suffixes, so --ease-in-out and easings['in-out'] cannot drift.
export const easings = {
	out: 'cubic-bezier(0.16, 1, 0.3, 1)',
	'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
	linear: 'linear'
} as const;

/** Svelte spring presets: normalised 0..1 stiffness and damping. */
export const springs = {
	settle: { stiffness: 0.12, damping: 0.72 },
	pop: { stiffness: 0.2, damping: 0.55 },
	drag: { stiffness: 0.06, damping: 0.85 }
} as const;

export type DurationName = keyof typeof durations;
export type EasingName = keyof typeof easings;
export type SpringName = keyof typeof springs;
