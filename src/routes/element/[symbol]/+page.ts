import { redirect } from '@sveltejs/kit';
import { elements } from '#lib/data/elements.generated.ts';
import type { ElementCore } from '#lib/data/types.ts';
import type { PageLoad } from './$types';

// The route is the only selection state, so a deep link has to resolve to data
// or to nothing. Case is folded because people type `/element/fe`.
//
// It returns the core half only: the resolver runs in the same chunk as the grid,
// and the inspector asks for the rest itself once it is open.
export const load: PageLoad = ({ params }): { element: ElementCore } => {
	const wanted = params.symbol.trim().toLowerCase();
	const element = elements.find((candidate) => candidate.symbol.toLowerCase() === wanted);

	// An unknown symbol lands back on the table with one message, not on a 404
	// page and not on an empty panel.
	if (!element) redirect(307, '/?missing');

	return { element };
};
