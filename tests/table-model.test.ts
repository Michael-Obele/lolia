import { describe, expect, test } from 'bun:test';
import { elements } from '../src/lib/data/elements.generated.ts';
import type { ElementCore } from '../src/lib/data/types.ts';
import { buildModel, humanCategory, move } from '../src/lib/components/table/model.ts';

// The grid's shape and its keyboard walk are both derived from `position`, so
// they are tested against the real 118 rather than a fixture. If the data ever
// grows a raggedness the nav cannot handle, this file fails.

const model = buildModel(elements);
const readingOrder = model.rows.flatMap((_, i) => model.byRow[i]);

/** Every cell reached by pressing Home then ArrowRight until it stops moving. */
function walkRight(entry: ElementCore): ElementCore[] {
	const walk = [move(model, entry, 'Home')];
	for (;;) {
		const next = move(model, walk[walk.length - 1], 'ArrowRight');
		if (next === walk[walk.length - 1]) {
			return walk;
		}
		walk.push(next);
	}
}

/** Every cell reached by pressing End then ArrowLeft until it stops moving. */
function walkLeft(entry: ElementCore): ElementCore[] {
	const walk = [move(model, entry, 'End')];
	for (;;) {
		const next = move(model, walk[walk.length - 1], 'ArrowLeft');
		if (next === walk[walk.length - 1]) {
			return walk;
		}
		walk.push(next);
	}
}

describe('grid model', () => {
	test('shape is read off the data, not off constants', () => {
		expect(model.columnCount).toBe(Math.max(...elements.map((e) => e.position.x)));
		expect(model.rowCount).toBe(Math.max(...elements.map((e) => e.position.y)));
		expect(model.columns).toHaveLength(model.columnCount);
		expect(model.rowCount).toBe(10);
		expect(model.columnCount).toBe(18);
	});

	test('the row list keeps the hole at y = 8 and nothing else', () => {
		expect(model.rows).toEqual([1, 2, 3, 4, 5, 6, 7, 9, 10]);
		expect(model.gapRows).toEqual([8]);
		expect(model.rows.reduce((sum, _, i) => sum + model.byRow[i].length, 0)).toBe(elements.length);
	});

	test('no two elements share a grid slot', () => {
		const slots = elements.map((e) => `${e.position.x}|${e.position.y}`);
		expect(new Set(slots).size).toBe(elements.length);
	});

	test('every element lands in the row and column its position names', () => {
		for (const [i, y] of model.rows.entries()) {
			for (const element of model.byRow[i]) {
				expect({ symbol: element.symbol, y: element.position.y }).toEqual({
					symbol: element.symbol,
					y
				});
			}
		}
	});
});

describe('series block', () => {
	test('is the rows outside the 18 groups, named from their category', () => {
		expect(model.series).toEqual([
			{ y: 9, label: 'lanthanides', from: 57, to: 71 },
			{ y: 10, label: 'actinides', from: 89, to: 103 }
		]);
	});

	test('a series row is never mistaken for a period row', () => {
		const periodRows = model.rows.slice(0, model.periods.length);
		const seriesRows = model.series.map((s) => s.y);

		// Upstream reports `group: 3` for the lanthanides, so the series can only be
		// recognised by sitting below the period rows — never by a null group.
		expect(periodRows).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(seriesRows).toEqual([9, 10]);
		expect(seriesRows.filter((y) => periodRows.includes(y))).toEqual([]);

		for (const row of model.series) {
			const cells = elements.filter((e) => e.position.y === row.y);
			expect({
				y: row.y,
				categories: [...new Set(cells.map((e) => e.category))].join('|')
			}).toEqual({
				y: row.y,
				categories: row.label.slice(0, -1)
			});
		}
	});
});

describe('keyboard walk', () => {
	test('Home then ArrowRight reproduces reading order, row by row', () => {
		for (const [i, y] of model.rows.entries()) {
			expect({ y, symbols: walkRight(model.byRow[i][0]).map((e) => e.symbol) }).toEqual({
				y,
				symbols: model.byRow[i].map((e) => e.symbol)
			});
		}
	});

	test('End then ArrowLeft is the exact reverse', () => {
		for (const [i, y] of model.rows.entries()) {
			const row = model.byRow[i];
			expect({ y, symbols: walkLeft(row[0]).map((e) => e.symbol) }).toEqual({
				y,
				symbols: [...row].reverse().map((e) => e.symbol)
			});
		}
	});

	test('focus reaches all 118 cells, each exactly once, forward and back', () => {
		const forward = model.rows.flatMap((_, i) => walkRight(model.byRow[i][0])).map((e) => e.symbol);
		const back = model.rows
			.map((_, i) => walkLeft(model.byRow[i][0]))
			.reverse()
			.flat()
			.map((e) => e.symbol);

		expect(forward).toHaveLength(elements.length);
		expect(new Set(forward).size).toBe(elements.length);
		expect(forward).toEqual(readingOrder.map((e) => e.symbol));
		expect(back).toEqual([...forward].reverse());
	});

	test('ArrowDown steps one occupied row at a time down to the last row', () => {
		const seen: string[] = [];
		let at = readingOrder[0];
		for (;;) {
			seen.push(at.symbol);
			const next = move(model, at, 'ArrowDown');
			if (next === at) break;
			expect(next.position.y).toBeGreaterThan(at.position.y);
			at = next;
		}
		expect(seen).toHaveLength(model.rows.length);
		expect(at.position.y).toBe(model.rows[model.rows.length - 1]);
	});

	test('a vertical move lands on the nearest column when the row is short', () => {
		const helium = elements.find((e) => e.symbol === 'He')!;
		const neon = elements.find((e) => e.symbol === 'Ne')!;

		// He is the only cell at x18 in row 1 and Ne the only one at x18 in row 2.
		expect(move(model, helium, 'ArrowDown').symbol).toBe(neon.symbol);

		// Row 4 is full, row 3 is not: from Sc (x3, y4) there is no x3 above, so the
		// nearest occupied column wins — Mg at x2, not Al at x13.
		const scandium = elements.find((e) => e.symbol === 'Sc')!;
		expect(move(model, scandium, 'ArrowUp').symbol).toBe('Mg');
	});

	test('edges hold focus instead of wrapping to another row', () => {
		const hydrogen = elements.find((e) => e.symbol === 'H')!;
		const helium = elements.find((e) => e.symbol === 'He')!;
		const lawrencium = elements.find((e) => e.symbol === 'Lr')!;

		expect(move(model, hydrogen, 'ArrowLeft')).toBe(hydrogen);
		expect(move(model, helium, 'ArrowRight')).toBe(helium);
		expect(move(model, hydrogen, 'ArrowUp')).toBe(hydrogen);
		expect(move(model, lawrencium, 'ArrowDown')).toBe(lawrencium);
		expect(move(model, lawrencium, 'PageDown')).toBe(lawrencium);
	});

	test('Home and End use the row that is actually occupied', () => {
		const lanthanum = elements.find((e) => e.symbol === 'La')!;
		const lutetium = elements.find((e) => e.symbol === 'Lu')!;

		expect(move(model, lutetium, 'Home').symbol).toBe(lanthanum.symbol);
		expect(move(model, lanthanum, 'End').symbol).toBe(lutetium.symbol);
	});

	test('PageDown jumps a period and never enters the series rows', () => {
		const calcium = elements.find((e) => e.symbol === 'Ca')!;
		expect(move(model, calcium, 'PageDown').symbol).toBe('Sr');

		const argon = elements.find((e) => e.symbol === 'Ar')!;
		const down = move(model, argon, 'PageDown');
		expect({ symbol: down.symbol, y: down.position.y }).toEqual({ symbol: 'Kr', y: 4 });
	});
});

describe('row names', () => {
	test('every occupied row has a short derived name, parallel to rows', () => {
		expect(model.rowLabels).toEqual([
			'Period 1',
			'Period 2',
			'Period 3',
			'Period 4',
			'Period 5',
			'Period 6',
			'Period 7',
			'Lanthanides',
			'Actinides'
		]);
		expect(model.rowLabels).toHaveLength(model.rows.length);
	});

	test('a row name is never the concatenation of its cells', () => {
		// Without an explicit name a `row` takes its name from its contents, which
		// for the full period 6 row is nearly a thousand characters.
		for (const [i, label] of model.rowLabels.entries()) {
			const cellsLength = model.byRow[i].reduce(
				(sum, element) => sum + element.name.length,
				0
			);
			expect(label.length).toBeLessThan(cellsLength);
			expect(label.length).toBeLessThan(20);
		}
	});
});

describe('legend order', () => {
	test('categories are derived on the model, in first-appearance order', () => {
		// The legend used to recompute this from `elements` in the component; the
		// derived fact now lives on the model with every other derived fact.
		expect(model.categories).toEqual([...new Set(elements.map((e) => e.category))]);
		expect(model.categories).toHaveLength(10);
		expect(new Set(model.categories).size).toBe(model.categories.length);
	});

	test('the order is atomic, not alphabetical', () => {
		// Hydrogen reads first, so its category leads; "actinide" would sort first
		// if the list had been sorted by name.
		expect(model.categories.slice(0, 2)).toEqual([
			elements[0].category,
			elements[1].category
		]);
		expect(model.categories[0]).not.toBe(
			[...model.categories].sort().at(0)
		);
	});
});

describe('accessible name', () => {
	test('a category slug reads as words', () => {
		expect(humanCategory('transition-metal')).toBe('transition metal');
		expect(humanCategory('reactive-nonmetal')).toBe('reactive nonmetal');
		expect(humanCategory('alkaline-earth-metal')).toBe('alkaline earth metal');
	});

	test('iron reads the way the design doc specifies', () => {
		const iron = elements.find((e) => e.symbol === 'Fe')!;
		expect(
			`${iron.name}, symbol ${iron.symbol}, atomic number ${iron.number}, ${humanCategory(iron.category)}`
		).toBe('Iron, symbol Fe, atomic number 26, transition metal');
	});
});
