<script lang="ts">
	import type { GridModel } from './model.ts';

	let {
		model,
		hover,
	}: {
		model: GridModel;
		hover: {
			group: number | null;
			period: number | null;
			row: number;
		} | null;
	} = $props();

	// The period rail is keyed by row, not by period number: a lanthanide reports
	// period 6 but sits on row 9, and lighting the "6" marker while the pointer is
	// three rows below it would be a lie. A series row has no marker, so it lights
	// none.
	const activeGroup = $derived(hover?.group ?? null);
	const activeRow = $derived(hover?.row ?? null);

	const periodRows = $derived(
		model.rows.map((y, i) => ({
			y,
			period: i < model.periods.length ? model.periods[i] : null,
		})),
	);

	/** The empty band the series block sits under, used for its caption. */
	const captionRow = $derived(model.gapRows[0] ?? null);
</script>

<div class="rail" aria-hidden="true">
	{#each model.columns as column (column)}
		<span
			class="group"
			style:grid-column={column + 1}
			data-active={activeGroup === column || undefined}>{column}</span
		>
	{/each}

	{#each periodRows as { y, period } (y)}
		{#if period !== null}
			<span
				class="period"
				style:grid-row={y + 1}
				data-active={activeRow === y || undefined}>{period}</span
			>
		{/if}
	{/each}

	{#if captionRow !== null}
		<span class="series" style:grid-row={captionRow + 1}>
			{#each model.series as { y, label, from, to } (y)}
				<span class="series-item">{label} {from} to {to}</span>
			{/each}
		</span>
	{/if}
</div>

<style>
	/* The rail draws into the table's own grid tracks, so the numbers line up
	   with the columns and rows they name without measuring anything. */
	.rail {
		display: contents;
	}

	.group,
	.period,
	.series {
		color: var(--ink-dim);
		font-family: var(--font-data);
		font-size: 0.625rem;
		opacity: 0.8;
	}

	.group {
		grid-row: 1;
		text-align: center;
		align-self: end;
		padding-block-end: 0.125rem;
	}

	.period {
		grid-column: 1;
		align-self: center;
		padding-inline-end: 0.375rem;
	}

	.group[data-active],
	.period[data-active] {
		color: var(--ink);
		opacity: 1;
	}

	.series {
		grid-column: 2 / -1;
		align-self: center;
		display: flex;
		gap: 1.25rem;
		padding-block-start: 0.375rem;
		border-block-start: 1px solid var(--line);
		text-transform: lowercase;
	}
</style>
