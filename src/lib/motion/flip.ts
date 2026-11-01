import { motionOk } from './reduced.ts';
import { easings, durations } from './tokens.ts';

// The "no teleport" rule: the inspector grows out of the cell that was touched.
// Two steps, never mixed — measure on pointer down (the cell is still where the
// finger is), animate after (one fixed-position element, no layout read while it
// moves). The cell and the panel live on different route pages, so the origin is
// the only state that has to survive the navigation.

/** The one breakpoint the whole app switches on. Above it, a side panel exists. */
const wide = window.matchMedia('(min-width: 720px)');

type Origin = { rect: DOMRect; colour: string };

let origin: Origin | null = null;

/**
 * Measure the cell now. A keyboard or touch selection leaves this empty on
 * purpose: there is no pointer rectangle to come from, and inventing one lies
 * about the layout.
 */
export function markOrigin(cell: HTMLElement): void {
	if (!motionOk() || !wide.matches) {
		origin = null;
		return;
	}
	origin = {
		rect: cell.getBoundingClientRect(),
		colour: getComputedStyle(cell).borderInlineStartColor
	};
}

/** Read the origin once. The panel that opens owns it from here. */
export function takeOrigin(): Origin | null {
	const taken = origin;
	origin = null;
	return taken;
}

/**
 * Fly one decorative wash from `from` to `to`, then call `done`. WAAPI owns the
 * interpolation, so there is no rAF loop here, and the ghost carries its own
 * `will-change` — which leaves with the node when the animation ends.
 */
export function travel(from: Origin, to: Element, done: () => void): void {
	const { rect } = from;
	const end = to.getBoundingClientRect();
	if (end.width === 0 || rect.width === 0) {
		done();
		return;
	}

	const ghost = document.createElement('div');
	ghost.setAttribute('aria-hidden', 'true');
	Object.assign(ghost.style, {
		position: 'fixed',
		left: `${rect.left}px`,
		top: `${rect.top}px`,
		width: `${rect.width}px`,
		height: `${rect.height}px`,
		background: from.colour,
		borderRadius: 'var(--radius)',
		// A clone that ate a click would be the bug the rules name: it takes no
		// pointer, and it is gone before anyone could aim at it anyway.
		pointerEvents: 'none',
		transformOrigin: 'top left',
		zIndex: '30',
		willChange: 'transform, opacity'
	});
	document.body.append(ghost);

	const animation = ghost.animate(
		[
			{ transform: 'none', opacity: 0.5 },
			{
				transform: `translate(${end.left - rect.left}px, ${end.top - rect.top}px) scale(${end.width / rect.width}, ${end.height / rect.height})`,
				opacity: 0
			}
		],
		{ duration: durations.base.ms, easing: easings.out, fill: 'forwards' }
	);

	// `oncancel` matters as much as `onfinish`: a torn-down page must not leave a
	// panel waiting for a ghost that will never land.
	const finish = () => {
		ghost.remove();
		done();
	};
	animation.onfinish = finish;
	animation.oncancel = finish;
}
