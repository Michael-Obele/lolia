<script lang="ts">
	import { elements } from '#lib/data/elements.generated.ts';
	import Cell from './Cell.svelte';
	import Legend from './Legend.svelte';
	import Rail from './Rail.svelte';
	import { buildModel, move, navKeys, type NavKey } from './model.ts';

	const model = buildModel(elements);

	// Roving tabindex: exactly one cell is tabbable, so Tab leaves the grid in one
	// stop and arrow keys do the walking.
	let cursor = $state(elements[0].symbol);
	let hover = $state<{
		group: number | null;
		period: number | null;
		row: number;
	} | null>(null);
	let table: HTMLDivElement | undefined = $state();

	// Tracks come from the data, not from a literal 18 or a literal 10.
	const columnTemplate = `auto repeat(${model.columnCount}, minmax(0, 1fr))`;
	const rowTemplate = `auto repeat(${model.rowCount}, auto)`;

	function focusCell(symbol: string) {
		table
			?.querySelector<HTMLAnchorElement>(`a[data-symbol="${symbol}"]`)
			?.focus();
	}

	// One delegated listener on the container: no per-cell handlers, and the
	// result lands on the grid as a data attribute the rails and the later
	// motion task can read from CSS.
	function onPointerOver(event: PointerEvent) {
		const cell = (event.target as HTMLElement).closest<HTMLElement>(
			"a[data-symbol]",
		);
		if (!cell) return;
		const group = cell.dataset.group ? Number(cell.dataset.group) : null;
		const period = cell.dataset.period ? Number(cell.dataset.period) : null;
		const row = Number(cell.dataset.row);
		if (hover?.group === group && hover?.row === row) return;
		hover = { group, period, row };
	}

	function onPointerLeave() {
		hover = null;
	}

	function onKeydown(event: KeyboardEvent) {
		if (!navKeys.has(event.key)) return;
		const cell = (event.target as HTMLElement).closest<HTMLElement>(
			"a[data-symbol]",
		);
		const from = elements.find(
			(element) => element.symbol === cell?.dataset.symbol,
		);
		if (!from) return;

		event.preventDefault();
		const to = move(model, from, event.key as NavKey);
		cursor = to.symbol;
		focusCell(to.symbol);
	}
</script>

<div
	class="table"
	bind:this={table}
	style:grid-template-columns={columnTemplate}
	style:grid-template-rows={rowTemplate}
	data-hover-group={hover?.group ?? undefined}
	data-hover-period={hover?.period ?? undefined}
	data-hover-row={hover?.row ?? undefined}
>
	<Rail {model} {hover} />

	<div
		class="cells"
		role="grid"
		tabindex="-1"
		aria-label="Periodic table of the elements, {elements.length} elements"
		aria-rowcount={model.rowCount}
		aria-colcount={model.columnCount}
		onkeydown={onKeydown}
		onpointerover={onPointerOver}
		onpointerleave={onPointerLeave}
	>
		{#each model.rows as y, i (y)}
			<div class="row" role="row">
				{#each model.byRow[i] as element (element.symbol)}
					<Cell
						{element}
						tabindex={element.symbol === cursor ? 0 : -1}
					/>
				{/each}
			</div>
		{/each}
	</div>
</div>

<Legend {elements} />

<style>
	/* One grid for rails and cells together. The rows are auto-sized by the cells
	   and the empty series band, so a rail placed at `grid-row: y + 1` lands on
	   the row it names without anybody measuring anything. */
	.table {
		display: grid;
		gap: 0.25rem;
		max-inline-size: 68rem;
		margin-inline: auto;
	}

	/* Subgrid, not a second grid: the cells inherit the table's own tracks, so
	   `position.x` and `position.y` stay the only placement numbers in the app. */
	.cells {
		grid-column: 2 / -1;
		grid-row: 2 / -1;
		display: grid;
		grid-template-columns: subgrid;
		grid-template-rows: subgrid;
	}

	.row {
		display: contents;
	}
</style>
