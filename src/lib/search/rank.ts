import { elements } from '#lib/data/elements.generated.ts';
import type { Element } from '#lib/data/types.ts';

// D11: 118 rows, five obvious tiers, no dependency. Case and diacritics fold
// before anything is compared, so `ǐron` and `IRON` are the same query.

/** 1 is the best match. The number is the whole ordering rule. */
export type Tier = 1 | 2 | 3 | 4 | 5;

export type Match = {
	element: Element;
	tier: Tier;
	/** Printed beside the row. Ordering is never a mystery. */
	reason: string;
};

/**
 * Alternate spellings people actually type, mapped to the folded name the data
 * uses. One table, no fuzzy scoring: D11 accepts that a misspelling outside this
 * table finds nothing.
 */
const aliases: Record<string, string> = {
	// The data says "Aluminium", so the American spelling is the alias here.
	aluminum: 'aluminium',
	sulphur: 'sulfur',
	caesium: 'cesium',
	wolfram: 'tungsten',
	natrium: 'sodium',
	kalium: 'potassium',
	ferrum: 'iron',
	plumbum: 'lead'
};

/** Lowercase, without combining marks. */
function fold(value: string): string {
	return value
		.normalize('NFD')
		.replace(/\p{M}+/gu, '')
		.toLowerCase()
		.trim();
}

export function rank(query: string, source: readonly Element[] = elements): Match[] {
	const typed = fold(query);
	if (!typed) return [];
	const needle = aliases[typed] ?? typed;
	const matches: Match[] = [];

	for (const element of source) {
		const symbol = element.symbol.toLowerCase();
		const name = fold(element.name);
		const category = element.category.replace(/-/g, ' ');

		if (symbol === needle) {
			matches.push({ element, tier: 1, reason: 'matches symbol' });
		} else if (symbol.startsWith(needle)) {
			matches.push({ element, tier: 2, reason: 'starts with the symbol' });
		} else if (name.startsWith(needle)) {
			matches.push({
				element,
				tier: 3,
				reason: name === needle ? 'matches name' : 'name starts with the query'
			});
		} else if (name.includes(needle)) {
			matches.push({ element, tier: 4, reason: 'name contains the query' });
		} else if (category.split(' ').some((word) => word.startsWith(needle))) {
			matches.push({ element, tier: 5, reason: `category: ${category}` });
		} else if (element.block && (element.block === needle || `${element.block}-block` === needle)) {
			matches.push({ element, tier: 5, reason: `block ${element.block}` });
		}
	}

	// Ties break by atomic number: the order the table already teaches.
	return matches.sort((a, b) => a.tier - b.tier || a.element.number - b.element.number);
}
