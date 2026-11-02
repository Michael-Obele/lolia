// The palette has one trigger in the header and one shortcut that has to work
// from anywhere, so its open state lives here rather than inside the component
// that draws it. Focus is remembered here too: the Cmd+K path has no click, and
// Escape still has to land the user back where they were.

export const palette = $state({ open: false });

let previous: HTMLElement | null = null;

export function openPalette(): void {
	if (palette.open) return;
	previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
	palette.open = true;
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
