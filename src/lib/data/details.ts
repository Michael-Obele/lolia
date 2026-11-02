// The detail half of the element payload, fetched on demand.
//
// `elements.generated.ts` is the eight-or-so fields a cell, a list row and a
// search result print, and every route carries it. Everything else — summaries,
// ionization series, radii, photos, sources — lives in a chunk of its own, and
// the table route must never import it statically. This module is the only way
// in: one shared `import()` promise, one per-symbol cache, no spinner.
//
// A caller that already holds the object keeps using it; a caller that needs a
// field it does not have waits for this and renders what arrives.

import type { ElementDetail } from './types.ts';

let loaded: Promise<Record<string, ElementDetail>> | null = null;

/**
 * The whole detail payload. Called from a route that genuinely prints all of
 * it (`/compare`, `/trends`, the settings download) and from `getDetail` below.
 * The promise is memoised, so a hundred selections are one request.
 */
export function loadDetails(): Promise<Record<string, ElementDetail>> {
	loaded ??= import('#lib/data/element-details.generated.ts').then((module) => module.details);
	return loaded;
}

const cache = new Map<string, ElementDetail>();

/**
 * One element's detail, or `null` when the data has none for that symbol.
 * The answer is cached per symbol, so re-selecting an element never re-awaits.
 */
export async function getDetail(symbol: string): Promise<ElementDetail | null> {
	const known = cache.get(symbol);
	if (known !== undefined) return known;

	const details = await loadDetails();
	const found = details[symbol];
	if (found === undefined) return null;

	cache.set(symbol, found);
	return found;
}
