import { elements } from '#lib/data/elements.generated.ts';

// D12: four small values in localStorage under `lolia.*`, every read and write
// wrapped. The tray is user intent, so it outlives a reload; when storage is
// blocked it degrades to memory and says nothing.

export const TRAY_KEY = 'lolia.tray';
export const TRAY_LIMIT = 4;

/** One reason, one place. The refusal is the same wherever it is shown. */
export const TRAY_FULL = `The compare tray holds ${TRAY_LIMIT} elements. Remove one to add another.`;

const known = new Set(elements.map((element) => element.symbol));

/** Where a chip should fly from. Exactly what `travel` in `motion/flip.ts` wants. */
export type Flight = { rect: DOMRect; colour: string };

function read(): string[] {
	try {
		const raw = localStorage.getItem(TRAY_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		// Symbols this build does not know — an old tray, a hand-edited value — are
		// dropped rather than rendered as blanks.
		return parsed
			.filter((symbol): symbol is string => typeof symbol === 'string' && known.has(symbol))
			.slice(0, TRAY_LIMIT);
	} catch {
		return [];
	}
}

class Tray {
	symbols: string[] = $state([]);
	/** Why the last add did not happen, or null. Shown, never swallowed. */
	refusal: string | null = $state(null);
	/** Set by the add, read once by the tray so the chip can fly to its slot. */
	pending: Flight | null = $state(null);

	constructor() {
		this.symbols = read();
	}

	has(symbol: string): boolean {
		return this.symbols.includes(symbol);
	}

	get full(): boolean {
		return this.symbols.length >= TRAY_LIMIT;
	}

	add(symbol: string, from?: Flight): boolean {
		if (this.has(symbol)) return true;
		if (this.full) {
			this.refusal = TRAY_FULL;
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
