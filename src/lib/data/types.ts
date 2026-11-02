// The app-facing shape of one element. Hand-written on purpose: the build script
// imports these types, so the generated array cannot drift from what the UI
// expects, and regenerating never rewrites this file.

/** The ten colour channels the table groups elements into. */
export type ElementCategory =
	| 'alkali-metal'
	| 'alkaline-earth-metal'
	| 'transition-metal'
	| 'post-transition-metal'
	| 'metalloid'
	| 'reactive-nonmetal'
	| 'noble-gas'
	| 'lanthanide'
	| 'actinide'
	| 'unknown';

/** Orbital block. `null` only if upstream ever stops reporting one. */
export type ElementBlock = 's' | 'p' | 'd' | 'f';

/** Phase at standard conditions. Upstream strings we do not recognise become `unknown`. */
export type ElementPhase = 'solid' | 'liquid' | 'gas' | 'unknown';

/**
 * Atomic radii in picometres, one number per kind. Upstream reports each kind as
 * an array of measured values; the UI shows one, so the first value is kept.
 */
export type ElementRadii = {
	empirical: number | null;
	calculated: number | null;
	vanDerWaals: number | null;
	covalentSingle: number | null;
	covalentTriple: number | null;
	metallic: number | null;
};

/** Upstream photo of the element. Remote and CC-licensed, so it always travels with attribution. */
export type ElementImage = {
	url: string;
	title: string;
	attribution: string;
};

/** Density as upstream recorded it. The unit is data, never assumed. */
export type ElementDensity = { value: number; unit: string | null };

/**
 * What the grid, the list and the tray need to draw and name an element.
 *
 * This is the half of the payload every route carries. `element-details.generated.ts`
 * holds the rest and arrives from its own chunk (`#lib/data/details.ts`), so the
 * table route never pays for a summary it does not print.
 */
export type ElementCore = {
	/** Atomic number. Primary key, and the sort order of the generated array. */
	number: number;
	symbol: string;
	name: string;
	/** Lowercase name with non-alphanumerics collapsed to `-`. Search and deep links. */
	slug: string;
	category: ElementCategory;
	block: ElementBlock | null;
	/** `null` means "no group" — upstream leaves it out of the two series rows. */
	group: number | null;
	period: number | null;
	/** Grid coordinates straight from upstream `xpos`/`ypos`. The layout truth. */
	position: { x: number; y: number };
	phase: ElementPhase;
};

/**
 * What only the inspector, the compare table and the expanded list row print.
 * Keyed by symbol in `details`, which is why it carries no `symbol` of its own.
 */
export type ElementDetail = {
	mass: number | null;
	/** Kelvin. Never converted at rest; formatting happens at render. */
	meltingPoint: number | null;
	boilingPoint: number | null;
	density: ElementDensity | null;
	electronegativity: number | null;
	electronAffinity: number | null;
	ionizationEnergies: number[];
	/** Electrons per shell, innermost first. */
	shells: number[];
	electronConfiguration: string | null;
	electronConfigurationSemantic: string | null;
	radii: ElementRadii;
	discoveredBy: string | null;
	namedBy: string | null;
	summary: string | null;
	image: ElementImage | null;
	/** Upstream Wikipedia URL for this element. */
	source: string | null;
	spectralImage: string | null;
};

/**
 * Both halves. Only for code that genuinely wants a whole element — tests that
 * read the payload, and anything that joins the two at runtime. A component
 * should ask for the half it prints.
 */
export type Element = ElementCore & ElementDetail;
