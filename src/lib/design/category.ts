import type { ElementCategory } from '#lib/data/types.ts';

// Category slug to hue token. Written out because the token name is not the
// slug (reactive-nonmetal is --cat-nonmetal), and Record<ElementCategory, …>
// makes a renamed or added slug a compile error.
const categoryVars = {
	'alkali-metal': 'var(--cat-alkali)',
	'alkaline-earth-metal': 'var(--cat-alkaline-earth)',
	'transition-metal': 'var(--cat-transition)',
	'post-transition-metal': 'var(--cat-post-transition)',
	metalloid: 'var(--cat-metalloid)',
	'reactive-nonmetal': 'var(--cat-nonmetal)',
	'noble-gas': 'var(--cat-noble-gas)',
	lanthanide: 'var(--cat-lanthanide)',
	actinide: 'var(--cat-actinide)',
	unknown: 'var(--cat-unknown)'
} as const satisfies Record<ElementCategory, `var(--cat-${string})`>;

export function categoryVar(slug: ElementCategory): string {
	return categoryVars[slug];
}

export const categorySlugs = Object.keys(categoryVars) as ElementCategory[];
