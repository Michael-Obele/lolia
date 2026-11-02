import { CAP_NARROW, capFor, overflow, refusal, sanitize, WIDE_QUERY } from './cap.ts';

// D12: a few small values in localStorage under `lolia.*`, every read and write
// wrapped. The tray is user intent, so it outlives a reload; when storage is
// blocked it degrades to memory and says nothing. How many it holds is a rule of
// the screen, so it lives in `cap.ts` and arrives here as one number.

export const TRAY_KEY = 'lolia.tray';

/** Where a chip should fly from. Exactly what `travel` in `motion/flip.ts` wants. */
export type Flight = { rect: DOMRect; colour: string };

function read(): string[] {
	try {
		const raw = localStorage.getItem(TRAY_KEY);
		if (!raw) return [];
		// Symbols this build does not know — an old tray, a hand-edited value — are
		// dropped rather than rendered as blanks.
		return sanitize(JSON.parse(raw) as unknown);
	} catch {
		return [];
	}
}

/** The one media query read in the app. `true` means the wide cap, not a width. */
function wide(): boolean {
	return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
		? window.matchMedia(WIDE_QUERY).matches
		: false;
}

class Tray {
	symbols: string[] = $state([]);
	/** This screen's cap. Moves with the media query, never with a resize handler. */
	cap: number = $state(CAP_NARROW);
	/** Why the last add did not happen, or null. Shown, never swallowed. */
	refusal: string | null = $state(null);
	/** Set by the add, read once by the tray so the chip can fly to its slot. */
	pending: Flight | null = $state(null);

	constructor() {
		this.symbols = read();
		this.cap = capFor(wide());
	}

	has(symbol: string): boolean {
		return this.symbols.includes(symbol);
	}

	/** What this screen shows. A tray that outgrew the cap keeps its tail in storage. */
	get visible(): string[] {
		return this.symbols.slice(0, this.cap);
	}

	/** Collected elements this screen cannot show. Shown, never silent. */
	get hidden(): number {
		return overflow(this.symbols, this.cap);
	}

	get full(): boolean {
		return this.symbols.length >= this.cap;
	}

	/** The media query's answer, applied to the one number that depends on it. */
	setCap(wideScreen: boolean): void {
		this.cap = capFor(wideScreen);
	}

	add(symbol: string, from?: Flight): boolean {
		if (this.has(symbol)) return true;
		if (this.full) {
			this.refusal = refusal(this.cap);
			return false;
		}
		this.symbols = [...this.symbols, symbol];
		this.refusal = null;
		this.pending = from ?? null;
		this.#write();
		return true;
	}

	remove(symbol: string): void {
		this.symbols = this.symbols.filter((kept) => kept !== symbol);
		this.refusal = null;
		this.#write();
	}

	toggle(symbol: string, from?: Flight): boolean {
		if (this.has(symbol)) {
			this.remove(symbol);
			return false;
		}
		return this.add(symbol, from);
	}

	#write(): void {
		try {
			localStorage.setItem(TRAY_KEY, JSON.stringify(this.symbols));
		} catch {
			// Private mode and some WebViews: in memory only, no message on screen.
		}
	}
}

export const tray = new Tray();

// One query, one listener, for the whole app. Mounted here rather than in a
// component, so no route can quietly add a second one.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
	window.matchMedia(WIDE_QUERY).addEventListener('change', (event) => tray.setCap(event.matches));
}
