/**
 * One capability check at boot. Components ask these booleans, never the shell
 * globals: a static import of a Capacitor plugin breaks the desktop build, and
 * `window.__TAURI__` does not exist in a browser.
 *
 * Nothing is imported here on purpose. The Capacitor native bridge injects
 * `window.Capacitor` before the first app script runs, so reading it costs zero
 * bytes in every target and cannot fail at build time.
 */

type Shell = {
	isNativePlatform?: () => boolean;
	isPluginAvailable?: (name: string) => boolean;
};

const shell = (globalThis as unknown as { Capacitor?: Shell }).Capacitor;

export const hasNativeShell = shell?.isNativePlatform?.() === true;

/** True only where the Haptics plugin is actually bundled into the shell. */
export const hasHaptics = shell?.isPluginAvailable?.('Haptics') === true;

export const hasViewTransitions =
	typeof document !== 'undefined' &&
	typeof document.startViewTransition === 'function';
