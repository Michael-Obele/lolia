// Only the core half: the grid never prints a melting point, so it never asks
// for one. `ElementCore` is what `elements.generated.ts` holds.
import type { ElementCategory, ElementCore } from '#lib/data/types.ts';

// The table's shape is data, not constants: every number the grid lays itself
// out with is read from `position` here, so the components never carry a literal
// column count, row count or cell count.

/** Category slug as words: `transition-metal` becomes `transition metal`. */
export function humanCategory(slug: string): string {
	return slug.replaceAll('-', ' ');
}

/** The series block rows (lanthanides, actinides) and what to call them. */
export type Series = {
	/** Grid `y` of the row. */
	y: number;
	/** Human name, derived from the row's category slug — `lanthanides`. */
	label: string;
	from: number;
	to: number;
};

export type GridModel = {
	/** Occupied columns, ascending. */
	columns: number[];
	/** Occupied rows, ascending. Row 8 is missing: it is the series separator. */
	rows: number[];
	/** Periods that exist in the main block, ascending. */
	periods: number[];
	/** Row tracks the grid needs, i.e. the data's `y` space including gaps. */
	rowCount: number;
	columnCount: number;
	/** Rows inside the range that hold no element — the series separation band. */
	gapRows: number[];
	series: Series[];
	/** Cells of each row, ascending by `x`. Parallel to `rows`. */
	byRow: ElementCore[][];
	/** Cells of each period, ascending by `x`. Parallel to `periods`. */
	byPeriod: ElementCore[][];
	/** Short name per occupied row, parallel to `rows` — `Period 4`, `Lanthanides`. */
	rowLabels: string[];
	/** Category slugs in first-appearance order — the legend's order, derived once. */
	categories: ElementCategory[];
};

export type NavKey =
	| 'ArrowLeft'
	| 'ArrowRight'
	| 'ArrowUp'
	| 'ArrowDown'
	| 'Home'
	| 'End'
	| 'PageUp'
	| 'PageDown';

export const navKeys = new Set<string>([
	'ArrowLeft',
	'ArrowRight',
	'ArrowUp',
	'ArrowDown',
	'Home',
	'End',
	'PageUp',
	'PageDown'
]);

const byX = (a: ElementCore, b: ElementCore) => a.position.x - b.position.x;

const uniqueSorted = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);

export function buildModel(elements: ElementCore[]): GridModel {
	const rows = uniqueSorted(elements.map((e) => e.position.y));
	const columns = uniqueSorted(elements.map((e) => e.position.x));
	const rowCount = Math.max(...rows);
	const columnCount = Math.max(...columns);

	const periods = uniqueSorted(
		elements.flatMap((e) => (e.period === null ? [] : [e.period]))
	);

	// Upstream gives the lanthanides `group: 3`, so the only honest way to tell the
	// pulled-out series from a period row is where the row sits: the main block is
	// the first row per period, and everything under it is a series.
	const mainRows = new Set(rows.slice(0, periods.length));

	const byRow = rows.map((y) => elements.filter((e) => e.position.y === y).sort(byX));
	const byPeriod = periods.map((p) =>
		elements.filter((e) => e.period === p && mainRows.has(e.position.y)).sort(byX)
	);

	const series = byRow.slice(periods.length).map((cells, i) =>
		({
			y: rows[periods.length + i],
			label: `${humanCategory(cells[0].category)}s`,
			from: Math.min(...cells.map((e) => e.number)),
			to: Math.max(...cells.map((e) => e.number))
		})
	);

	const lowest = rows[0];
	const gapRows = Array.from({ length: rowCount - lowest + 1 }, (_, i) => lowest + i).filter(
		(y) => !rows.includes(y)
	);

	// A row's accessible name must not be the concatenation of its cells, which is
	// what a `row` gets from name-from-content. Each row therefore states its own
	// short name: the period it belongs to, or the series it holds.
	const rowLabels = rows.map((_, i) => {
		if (i < periods.length) return `Period ${periods[i]}`;
		const { label } = series[i - periods.length];
		return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
	});

	// First appearance in atomic order, not alphabetical: the legend then reads the
	// way a newcomer meets the categories while scanning the table.
	const categories = [...new Set(elements.map((e) => e.category))];

	return {
		columns,
		rows,
		periods,
		rowCount,
		columnCount,
		gapRows,
		series,
		byRow,
		byPeriod,
		rowLabels,
		categories
	};
}

/** The cell closest to `x` — ties keep the leftmost, which reads as "same column". */
function nearest(cells: ElementCore[], x: number): ElementCore {
	// Nearest-column navigation is deliberately not involutive, and that is not a
	// bug to file. Rows are ragged: row 6 has nothing at x3 because the lanthanides
	// are pulled out below it. So Y (x3, row 5) steps down to Ba (x2, row 6), while
	// Ba steps back up to Sr (x2, row 5) — a different cell in the same column it
	// landed on. Anything that round-trips exactly would have to remember the
	// column you came from, and a plain arrow key has nowhere to store it.
	return cells.reduce((best, cell) =>
		Math.abs(cell.position.x - x) < Math.abs(best.position.x - x) ? cell : best
	);
}

function step(
	keys: number[],
	current: number,
	groups: ElementCore[][],
	from: ElementCore,
	delta: number
) {
	const i = keys.indexOf(current);
	const group = i === -1 ? undefined : groups[i + delta];
	return group ? nearest(group, from.position.x) : from;
}

/**
 * Where focus goes for a key press. Rows are ragged, so a vertical move lands on
 * the nearest cell in the next *occupied* row rather than the same column, and
 * `from` comes back unchanged at an edge so callers can detect a dead key.
 */
export function move(model: GridModel, from: ElementCore, key: NavKey): ElementCore {
	const row = model.byRow[model.rows.indexOf(from.position.y)];
	const at = row.indexOf(from);

	switch (key) {
		case 'ArrowLeft':
			return row[at - 1] ?? from;
		case 'ArrowRight':
			return row[at + 1] ?? from;
		case 'Home':
			return row[0];
		case 'End':
			return row[row.length - 1];
		case 'ArrowUp':
			return step(model.rows, from.position.y, model.byRow, from, -1);
		case 'ArrowDown':
			return step(model.rows, from.position.y, model.byRow, from, 1);
		case 'PageUp':
			return step(model.periods, from.period ?? 0, model.byPeriod, from, -1);
		case 'PageDown':
			return step(model.periods, from.period ?? 0, model.byPeriod, from, 1);
	}
}
