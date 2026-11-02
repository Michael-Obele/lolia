// The palette has one trigger in the header and one shortcut that has to work
// from anywhere, so its open state lives here rather than inside the component
// that draws it. Focus is remembered here too: the Cmd+K path has no click, and
// Escape still has to land the user back where they were.
//
// The body itself is a lazy chunk. bits-ui's `Command` plus the palette markup is
// about 9 KB gzip, and a reader who never searches should not download it on the
// table route, which has a 110 KB budget. The cost of splitting is a fetch in
// front of the first open, so this module warms the chunk in the idle gap after
// first paint and again on the first interaction. By the time a hand reaches
// Cmd+K the module is already in memory and opening is a state flip.

type PaletteBody = typeof import('#lib/components/search/Command.svelte')['default'];

export const palette = $state({ open: false });

/** The palette body once its chunk has landed. `null` is the initial load: it is
 *  what keeps the chunk out of the route graph. */
export const paletteBody: { current: PaletteBody | null } = $state({ current: null });

let previous: HTMLElement | null = null;
let loading: Promise<PaletteBody | null> | null = null;

/**
 * The one dynamic import of the palette body. The idle prefetch, the first
 * interaction and an early Cmd+K all call this, so the chunk is requested once
 * and a failure is remembered rather than retried on every keypress.
 */
export function warmPalette(): Promise<PaletteBody | null> {
	loading ??= import('#lib/components/search/Command.svelte').then(
		(module) => (paletteBody.current = module.default),
		() => null
	);
	return loading;
}

export function openPalette(): void {
	if (palette.open) return;
	previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
	palette.open = true;
	void warmPalette();
}

export function closePalette(): void {
	palette.open = false;
}

export function togglePalette(): void {
	if (palette.open) closePalette();
	else openPalette();
}

/** Hand focus back to whatever had it. Called from the dialog's close hook. */
export function restoreFocus(): void {
	previous?.focus();
	previous = null;
}

// A prefetch that arrives after the page has settled is worth nothing, so the
// idle callback gets a deadline. Safari has no `requestIdleCallback`, and there
// the timer is the same promise with a worse guess at "idle".
const IDLE_DEADLINE = 2000;

type IdleWindow = Window & {
	requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
};

let started = false;

/**
 * Registered once, at mount, by the root layout — and deliberately not inside
 * the palette body, which does not exist yet when the first Cmd+K arrives.
 */
export function initPalette(): void {
	if (started) return;
	started = true;

	const idle = window as IdleWindow;
	if (typeof idle.requestIdleCallback === 'function') {
		idle.requestIdleCallback(() => void warmPalette(), { timeout: IDLE_DEADLINE });
	} else {
		setTimeout(() => void warmPalette(), IDLE_DEADLINE);
	}

	// Capture phase, so the warm starts on the press rather than after the app
	// has finished handling it, and `once`, so this is not a permanent listener
	// on every interaction the page ever gets.
	const first = () => void warmPalette();
	addEventListener('pointerdown', first, { once: true, capture: true, passive: true });
	addEventListener('keydown', first, { once: true, capture: true });

	// The one shortcut that must work from anywhere — inside the sheet, inside
	// the settings dialog — so it listens on the window rather than a control.
	addEventListener('keydown', (event) => {
		if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
		event.preventDefault();
		togglePalette();
	});
}
