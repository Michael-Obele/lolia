import type { EasingName } from './tokens.ts';

// d3-ease equivalents of the CSS easing tokens, for layerchart's `motion` prop.
// Written inline because d3-ease is not installed and these are one line each.

export type Easing = (t: number) => number;

const easeOutCubic: Easing = (t) => 1 - (1 - t) ** 3;
const easeInOutCubic: Easing = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const linear: Easing = (t) => t;

export const easing: Record<EasingName, Easing> = {
	out: easeOutCubic,
	'in-out': easeInOutCubic,
	linear
};
