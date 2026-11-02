import { describe, expect, test } from 'bun:test';
import { elementCount, metrics } from '../src/lib/data/metrics.ts';
import { details } from '../src/lib/data/element-details.generated.ts';
import { elements } from '../src/lib/data/elements.generated.ts';

// The two halves of the generated payload, joined the way `metrics.ts` joins them,
// so a test can read a detail field without pretending the core array has one.
const full = elements.flatMap((core) => {
	const detail = details[core.symbol];
	return detail === undefined ? [] : [{ ...core, ...detail }];
});

// `/trends` plots whatever these rows say, so the rows are the contract: long
// format, one row per element per metric, never a value the data does not hold,
// and never a value borrowed from another metric's unit.

const byId = new Map(metrics.map((metric) => [metric.id, metric]));

function metric(id: (typeof metrics)[number]['id']) {
	const found = byId.get(id);
	if (!found) throw new Error(`no metric ${id}`);
	return found;
}

describe('the long table', () => {
	test('every metric keeps one row per element, and never repeats one', () => {
		for (const entry of metrics) {
			const seen = new Set(entry.rows.map((row) => row.atomicNumber));
			expect(seen.size).toBe(entry.rows.length);
			expect(entry.rows.every((row) => row.metric === entry.id)).toBe(true);
		}
	});

	test('a row is finite, named and coloured by category', () => {
		for (const entry of metrics) {
			for (const row of entry.rows) {
				expect(Number.isFinite(row.value)).toBe(true);
				expect(row.symbol.length).toBeGreaterThan(0);
				expect(row.name.length).toBeGreaterThan(0);
				expect(row.category.length).toBeGreaterThan(0);
			}
		}
	});

	test('plotted plus omitted is every element, for every metric', () => {
		for (const entry of metrics) {
			expect(entry.rows.length + entry.omitted).toBe(elementCount);
		}
	});

	test('rows follow the generated array, so x ascends with atomic number', () => {
		for (const entry of metrics) {
			const numbers = entry.rows.map((row) => row.atomicNumber);
			expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
		}
	});
});

describe('omission', () => {
	test('mass is the one metric every element has', () => {
		expect(metric('mass').omitted).toBe(0);
		expect(metric('mass').rows.length).toBe(elementCount);
	});

	test('a missing measurement is omitted, never plotted as zero', () => {
		// None of these six fields has a genuine zero upstream, so a zero in a plot
		// could only be a missing value dressed up as a measurement.
		for (const entry of metrics) {
			expect(entry.rows.every((row) => row.value > 0)).toBe(true);
		}
	});

	test('density plots one unit and reports the rest as other-unit', () => {
		const density = metric('density');
		const plottable = full.filter((element) => element.density?.unit === 'g/cm3').length;
		const otherUnit = full.filter(
			(element) => element.density !== null && element.density.unit !== 'g/cm3'
		).length;

		expect(density.rows.length).toBe(plottable);
		expect(density.otherUnit).toBe(otherUnit);
		// The count is stated separately from "no value at all", so the page can say why.
		expect(density.otherUnit).toBeGreaterThan(0);
		expect(density.omitted).toBeGreaterThan(density.otherUnit);
		expect(density.unit).toBe('g/cm³');
	});
});

describe('units are declared, not borrowed', () => {
	test('every metric names its own unit', () => {
		for (const entry of metrics) {
			expect(entry.unit.length).toBeGreaterThan(0);
		}
		// Melting and boiling share kelvin because the data shares it, not because
		// either borrowed it; every other metric has a unit of its own.
		expect(metrics.map((entry) => entry.unit)).toEqual([
			'u',
			'K',
			'K',
			'g/cm³',
			'Pauling',
			'kJ/mol'
		]);
	});

	test('the two temperature metrics are kelvin and say so', () => {
		expect(metric('melting').format(1811)).toBe('1811 K');
		expect(metric('boiling').format(3134)).toBe('3134 K');
	});

	test('ionization reads the first stored energy, not an average', () => {
		const iron = full.find((element) => element.symbol === 'Fe');
		const row = metric('ionization').rows.find((candidate) => candidate.atomicNumber === 26);
		expect(row?.value).toBe(iron?.ionizationEnergies[0]);
		expect(metric('ionization').unit).toBe('kJ/mol');
	});
});

describe('spot checks against the data', () => {
	test('iron melts at 1811 K', () => {
		const iron = metric('melting').rows.find((row) => row.symbol === 'Fe');
		expect(iron?.value).toBe(1811);
		expect(iron?.name).toBe('Iron');
	});

	test('hydrogen is the lightest element, and lithium the lightest plotted density', () => {
		expect(metric('mass').rows[0]?.symbol).toBe('H');
		// Hydrogen's density is stored in g/L, so density omits it rather than
		// quoting 0.08988 as grams per cubic centimetre.
		const lightest = metric('density').rows.reduce((best, row) =>
			row.value < best.value ? row : best
		);
		expect(lightest.symbol).toBe('Li');
		expect(lightest.value).toBe(0.534);
	});

	test('fluorine is the most electronegative element plotted', () => {
		const top = metric('electronegativity').rows.reduce((best, row) =>
			row.value > best.value ? row : best
		);
		expect(top.symbol).toBe('F');
		expect(top.value).toBe(3.98);
	});
});
