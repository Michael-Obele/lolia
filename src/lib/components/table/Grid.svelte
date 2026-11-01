<script lang="ts">
	import { elements } from '#lib/data/elements.generated.ts';
	import { markOrigin } from '#lib/motion/flip.ts';
	import { motionOk } from '#lib/motion/reduced.ts';
	import Cell from './Cell.svelte';
	import Legend from './Legend.svelte';
	import Rail from './Rail.svelte';
	import { buildModel, move, navKeys, type NavKey } from './model.ts';

	let { intro = false }: { intro?: boolean } = $props();

	const model = buildModel(elements);

	/** The once-per-install flag. `SettingsDialog` clears this same key. */
	const IGNITED = 'lolia.ignited';

	/**
	 * The ignition runs only on the table page, only when motion is welcome, and
	 * only when no earlier load claimed it. Claiming it here, before the first
	 * paint, is what makes a reload mid-show stay quiet instead of restarting.
	 */
	function claimIntro(): boolean {
		if (!intro || !motionOk()) return false;
		try {
			if (localStorage.getItem(IGNITED)) return false;
			localStorage.setItem(IGNITED, '1');
			return true;
		} catch {
			return false;
		}
	}

	// One class on the grid, decided at setup rather than on mount: on mount would
	// be one painted frame of fully lit cells before the stagger began.
	let phase = $state<'igniting' | 'fading' | null>(
		claimIntro() ? 'igniting' : intro && motionOk() ? 'fading' : null,
	);

	/** A tap during the show says "I know, show me the table". */
	function skipIntro() {
		if (phase === 'igniting') phase = null;
	}

	// The last element to start is the last to finish (its delay is the cap), so
	// its `animationend` is the end of the whole moment: the class comes off and
	// the grid holds no finished animations at all.
	function onCellAnimationEnd(event: AnimationEvent) {
		if ((event.target as HTMLElement).dataset.symbol === elements.at(-1)?.symbol) {
			phase = null;
		}
	}

	// Roving tabindex: exactly one cell is tabbable, so Tab leaves the grid in one
	// stop and arrow keys do the walking.
	let cursor = $state(elements[0].symbol);
	let hover = $state<{
		group: number | null;
		period: number | null;
		row: number;
	} | null>(null);
	let table: HTMLDivElement | undefined = $state();

	// Tracks come from the data, not from a literal 18 or a literal 10. The column
	// floor is the design's 44 px minimum cell width expressed in em, so it scales
	// with text zoom: at 200 percent the tracks double and the table pans, instead
	// of a 1fr track squeezing the symbol into the padding.
	const columnTemplate = `auto repeat(${model.columnCount}, minmax(2.75em, 1fr))`;
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

	// The ghost's origin is measured here, on the press, while the cell is still
	// exactly where the finger is. Nothing reads layout once it starts moving.
	function onPointerDown(event: PointerEvent) {
		const cell = (event.target as HTMLElement).closest<HTMLElement>(
			"a[data-symbol]",
		);
		if (!cell) return;
		skipIntro();
		markOrigin(cell);
	}

	// A pointer click focuses a cell without going through onKeydown, so the tab
	// stop has to follow the focus or the next Tab re-enters at the old cell.
	function onFocusIn(event: FocusEvent) {
		const cell = (event.target as HTMLElement).closest<HTMLElement>(
			"a[data-symbol]",
		);
		if (cell?.dataset.symbol) cursor = cell.dataset.symbol;
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
	data-motion={motionOk() ? 'ok' : 'off'}
>
	<Rail {model} {hover} />

	<div
		class="cells"
		class:igniting={phase === 'igniting'}
		class:fading={phase === 'fading'}
		role="grid"
		tabindex="-1"
		aria-label="Periodic table of the elements, {elements.length} elements"
		aria-rowcount={model.rowCount}
		aria-colcount={model.columnCount}
		onkeydown={onKeydown}
		onpointerover={onPointerOver}
		onpointerleave={onPointerLeave}
		onpointerdown={onPointerDown}
		onfocusin={onFocusIn}
		onanimationend={onCellAnimationEnd}
	>
		{#each model.rows as y, i (y)}
			<!-- `aria-rowindex` is the data's y, not the DOM row number: row 8 is absent
			     from the DOM, so the series rows are DOM 8 and 9 but grid rows 9 and 10.
			     The row states its own short name, or a `row` names itself from its cells
			     and every row is announced as a list of everything inside it. -->
			<div
				class="row"
				role="row"
				aria-rowindex={y}
				aria-label={model.rowLabels[i]}
			>
				{#each model.byRow[i] as element (element.symbol)}
					<!-- A row may only own gridcells, and the cell must be a real link. The
					     wrapper is display: contents, so the anchor keeps both its link
					     semantics and its placement in the subgrid. -->
					<div
						class="gridcell"
						role="gridcell"
						aria-colindex={element.position.x}
					>
						<Cell
							{element}
							tabindex={element.symbol === cursor ? 0 : -1}
						/>
					</div>
				{/each}
			</div>
		{/each}
	</div>
</div>

<Legend categories={model.categories} />

<style>
	/* One grid for rails and cells together. The rows are auto-sized by the cells
	   and the empty series band, so a rail placed at `grid-row: y + 1` lands on
	   the row it names without anybody measuring anything. */
	.table {
		display: grid;
		gap: 0.25rem;
		max-inline-size: 68rem;
		margin-inline: auto;
		/* The pan surface. The columns have an em floor, so below a certain width
		   they outgrow the viewport by design: the table pans instead of squeezing
		   the symbol. The inline padding is the room the focus ring needs at the
		   scrolled edge. */
		overflow-x: auto;
		overscroll-behavior-x: contain;
		padding-inline: 0.125rem;
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

	/* Skipped in the box tree, kept in the accessibility tree: the anchor stays a
	   link and a grid item, and the row gains the only child type it may own. */
	.gridcell {
		display: contents;
	}

	/* ── ignition ──────────────────────────────────────────────────────────────
	   One class on the grid, one custom property per cell. The delay is the
	   capped stagger, formatted in `#lib/motion/stagger.ts` so no component has
	   to write a duration. `both` fill is what makes the grid arrive dark: every
	   cell sits at the from-frame until its turn comes.
	   No `will-change` here: 118 elements would blow the eight-element budget the
	   rules set, and a one-off animation does not need the hint. */
	.igniting :global(a[data-symbol]) {
		animation: ignite var(--dur-story) var(--ease-out) both;
		animation-delay: var(--delay);
	}

	@keyframes ignite {
		from {
			opacity: 0;
			transform: scale(0.96);
			/* The documented exception: a white-hot arrival, once per install, on a
			   grid nobody is interacting with. */
			filter: brightness(2.2) saturate(0.2);
		}
		to {
			opacity: 1;
			transform: scale(1);
			filter: brightness(1) saturate(1);
		}
	}

	/* Every later load: the table is already there, it is only arriving. */
	.fading :global(a[data-symbol]) {
		animation: settle var(--dur-fast) var(--ease-out) both;
	}

	@keyframes settle {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* ── rail dim ──────────────────────────────────────────────────────────────
	   Everything in the group recedes, then the hovered row and the hovered group
	   come back. Row membership is a sibling fact the DOM already states, and the
	   group is the hover value this grid already publishes: both are read from
	   CSS, so nothing here runs per cell. Pointer only — a stale hover after a tap
	   should not drain the table. */
	@media (hover: hover) {
		.cells:hover :global(a[data-symbol]) {
			opacity: 0.4;
		}

		/* The table's own eighteen groups, laid out in the order the data uses.
		   A member keeps its full strength; a series cell dims with its row, which
		   is the only axis it has. */
		.table[data-hover-group='1'] :global(a[data-group='1']),
		.table[data-hover-group='2'] :global(a[data-group='2']),
		.table[data-hover-group='3'] :global(a[data-group='3']),
		.table[data-hover-group='4'] :global(a[data-group='4']),
		.table[data-hover-group='5'] :global(a[data-group='5']),
		.table[data-hover-group='6'] :global(a[data-group='6']),
		.table[data-hover-group='7'] :global(a[data-group='7']),
		.table[data-hover-group='8'] :global(a[data-group='8']),
		.table[data-hover-group='9'] :global(a[data-group='9']),
		.table[data-hover-group='10'] :global(a[data-group='10']),
		.table[data-hover-group='11'] :global(a[data-group='11']),
		.table[data-hover-group='12'] :global(a[data-group='12']),
		.table[data-hover-group='13'] :global(a[data-group='13']),
		.table[data-hover-group='14'] :global(a[data-group='14']),
		.table[data-hover-group='15'] :global(a[data-group='15']),
		.table[data-hover-group='16'] :global(a[data-group='16']),
		.table[data-hover-group='17'] :global(a[data-group='17']),
		.table[data-hover-group='18'] :global(a[data-group='18']) {
			opacity: 1;
		}

		.cells:has(:global(a:hover)) .row:has(:global(a:hover)) :global(a[data-symbol]) {
			opacity: 1;
		}
	}

	/* One gate, asked once by `motionOk()`. Under reduced motion the cell states
	   still change — they just change instantly instead of easing. */
	.table[data-motion='off'] :global(a[data-symbol]) {
		transition: none;
	}
</style>
