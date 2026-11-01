import { goto } from '$app/navigation';
import { hasNativeShell } from './capabilities.ts';

/**
 * One back handler for the whole app, registered once at boot, in one order:
 *
 *   1. the sheet closes, if it sits above its lowest snap
 *   2. `/element/<symbol>` is left
 *   3. the app exits
 *
 * Steps 2 and 3 are exactly what an unguarded history pop already does, so this
 * file only inserts step 1 in front of them: an expanded sheet owns a shallow
 * history entry, and a back press consumes that entry instead of the route.
 *
 * ponytail: Android hardware back reaches JS only through `@capacitor/app`'s
 * `backButton` listener, and that plugin is not bundled (bits-ui is this task's
 * only new dependency). `popstate` is the back channel every shell does expose:
 * browser back, Tauri, and Capacitor once the App plugin lands.
 */

let close: (() => boolean) | null = null;
let armed = false;
let started = false;

export function registerSheetClose(step: () => boolean): () => void {
	close = step;
	return () => {
		if (close === step) close = null;
	};
}

/** Give the sheet a history entry of its own, so the next back press reaches it. */
export function armBackGuard(): void {
	if (!hasNativeShell || armed) return;
	armed = true;
	void goto(location.href, { state: { sheet: true }, shallow: true });
}

export function disarmBackGuard(): void {
	armed = false;
}

export function initAndroidBack(): void {
	if (started || !hasNativeShell) return;
	started = true;

	addEventListener('popstate', () => {
		// Unarmed, steps 2 and 3 are the router's and the OS's business.
		if (!armed) return;
		armed = false;
		close?.();
	});
}
