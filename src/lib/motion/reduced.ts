import { prefersReducedMotion } from 'svelte/motion';

/** The only motion question a component may ask. */
export function motionOk(): boolean {
	return !prefersReducedMotion.current;
}
