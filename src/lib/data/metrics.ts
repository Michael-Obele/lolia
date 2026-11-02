// The six trends `/trends` can draw, each built once from the generated data.
//
// The table of rows stays long: one row per element per metric, with the metric
// and the category as their own columns. Nothing here pivots a metric into one
// column per category, and nothing here writes a value the data does not hold.
//
// Each metric owns its unit and its own formatters, so a metric can never quote
// another metric's unit, and its axis is scaled from its own rows because the
// chart is handed one metric's rows at a time.

import { elements } from '#lib/data/elements.generated.ts';
import type { Element, ElementCategory } from '#lib/data/types.ts';
import { decimal, densityUnit, formatMass } from '#lib/format/units.ts';

export type MetricId =
	| 'mass'
	| 'melting'
	| 'boiling'
	| 'density'
	| 'electronegativity'
	| 'ionization';

/**
 * One row of the long table: a single element's value for a single metric.
 * `atomicNumber` is x, `value` is y, and `category` is both the colour and the
 * grouping — one line per category, drawn from the chart's `c` column.
 */
export type TrendRow = {
	metric: MetricId;
	atomicNumber: number;
	name: string;
	symbol: string;
	category: ElementCategory;
	value: number;
};

export type Metric = {
	id: MetricId;
	/** Full name, for the heading and the switcher's accessible name. */
	label: string;
	/** Short name, because six full labels do not fit across a 390px phone. */
	short: string;
	/** The unit this metric plots in. Never inherited from another metric. */
	unit: string;
	rows: TrendRow[];
	/** Elements left out of the plot because there is no value to plot. */
	omitted: number;
	/** How many of `omitted` hold a value in a unit this metric does not plot. */
	otherUnit: number;
	/** An axis tick label. */
	tick(value: number): string;
	/** A value as text, for the readout. */
	format(value: number): string;
};

/** Density upstream arrives in one of two units. This metric plots one of them. */
const DENSITY_UNIT = 'g/cm3';

/**
 * What the data says about one element for one metric. `other-unit` exists so a
 * value recorded in grams per litre is reported as not plotted rather than
 * silently divided into grams per cubic centimetre — the app never invents a
 * unit for a stored value.
 */
type Reading =
	| { kind: 'value'; value: number }
	| { kind: 'missing' }
	| { kind: 'other-unit' };

function read(id: MetricId, element: Element): Reading {
	switch (id) {
		case 'mass':
			return element.mass === null ? { kind: 'missing' } : { kind: 'value', value: element.mass };
		case 'melting':
			return element.meltingPoint === null
				? { kind: 'missing' }
				: { kind: 'value', value: element.meltingPoint };
		case 'boiling':
			return element.boilingPoint === null
				? { kind: 'missing' }
				: { kind: 'value', value: element.boilingPoint };
		case 'density': {
			const density = element.density;
			if (density === null) return { kind: 'missing' };
			if (density.unit !== DENSITY_UNIT) return { kind: 'other-unit' };
			return { kind: 'value', value: density.value };
		}
		case 'electronegativity':
			return element.electronegativity === null
				? { kind: 'missing' }
				: { kind: 'value', value: element.electronegativity };
		case 'ionization': {
			// First ionization energy is the first stored energy, not an average.
			const first = element.ionizationEnergies[0];
			return first === undefined ? { kind: 'missing' } : { kind: 'value', value: first };
		}
	}
}

type Spec = Pick<Metric, 'id' | 'label' | 'short' | 'unit' | 'tick' | 'format'>;

const specs: Spec[] = [
	{
		id: 'mass',
		label: 'Atomic mass',
		short: 'Mass',
		unit: 'u',
		tick: (value) => decimal(value, 0),
		format: (value) => `${formatMass(value)} u`
	},
	{
		id: 'melting',
		label: 'Melting point',
		short: 'Melting',
		unit: 'K',
		tick: (value) => decimal(value, 0),
		format: (value) => `${decimal(value, 3)} K`
	},
	{
		id: 'boiling',
		label: 'Boiling point',
		short: 'Boiling',
		unit: 'K',
		tick: (value) => decimal(value, 0),
		format: (value) => `${decimal(value, 3)} K`
	},
	{
		id: 'density',
		label: 'Density',
		short: 'Density',
		unit: 'g/cm³',
		tick: (value) => decimal(value, 1),
		format: (value) => `${decimal(value, 3)} ${densityUnit(DENSITY_UNIT)}`
	},
	{
		id: 'electronegativity',
		label: 'Electronegativity',
		short: 'Electronegativity',
		unit: 'Pauling',
		tick: (value) => decimal(value, 1),
		format: (value) => decimal(value, 2)
	},
	{
		id: 'ionization',
		label: 'First ionization energy',
		short: 'Ionization',
		unit: 'kJ/mol',
		tick: (value) => decimal(value, 0),
		format: (value) => `${decimal(value, 1)} kJ/mol`
	}
];

/** Build one metric's rows by reading every element once. */
function build(spec: Spec): Metric {
	const rows: TrendRow[] = [];
	let omitted = 0;
	let otherUnit = 0;

	for (const element of elements) {
		const reading = read(spec.id, element);
		if (reading.kind === 'value') {
			rows.push({
				metric: spec.id,
				atomicNumber: element.number,
				name: element.name,
				symbol: element.symbol,
				category: element.category,
				value: reading.value
			});
		} else {
			omitted += 1;
			if (reading.kind === 'other-unit') otherUnit += 1;
		}
	}

	return { ...spec, rows, omitted, otherUnit };
}

export const metrics: Metric[] = specs.map(build);

/** How many elements the data describes. The denominator of every omission count. */
export const elementCount = elements.length;
