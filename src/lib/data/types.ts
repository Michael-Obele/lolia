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

export type Element = {
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
	mass: number | null;
	phase: ElementPhase;
	/** Kelvin. Never converted at rest; formatting happens at render. */
	meltingPoint: number | null;
	boilingPoint: number | null;
	/** `unit` is whatever upstream said (`g/cm3`, `g/L`). Never assumed. */
	density: { value: number; unit: string | null } | null;
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
