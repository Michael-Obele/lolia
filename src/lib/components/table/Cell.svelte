<script lang="ts">
	import type { Element } from '#lib/data/types.ts';
	import { categoryVar } from '#lib/design/category.ts';
	import { humanCategory } from './model.ts';

	let { element, tabindex = -1 }: { element: Element; tabindex?: number } =
		$props();

	// The one string a screen reader hears per cell. The visible text is
	// aria-hidden so the name is not announced twice.
	const label = $derived(
		`${element.name}, symbol ${element.symbol}, atomic number ${element.number}, ${humanCategory(element.category)}`,
	);
</script>

<a
	href="/element/{element.symbol}"
	{tabindex}
	aria-label={label}
	data-symbol={element.symbol}
	data-group={element.group}
	data-period={element.period}
	data-row={element.position.y}
	style:grid-column={element.position.x}
	style:grid-row={element.position.y}
	style:--cat={categoryVar(element.category)}
	class="cell"
>
	<span aria-hidden="true" class="stack">
		<span class="number">{element.number}</span>
		<span class="symbol">{element.symbol}</span>
		<span class="name">{element.name}</span>
		<span class="block">{element.block ?? '—'}</span>
	</span>
</a>

<style>
	.cell {
		display: block;
		min-block-size: 3.25rem;
		overflow: hidden;
		border-inline-start: 3px solid var(--cat);
		background: var(--surface);
		color: var(--ink);
		text-decoration: none;
	}

	/* The ring is never removed, only ever drawn on keyboard focus. */
	.cell:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}

	.stack {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		padding: 0.1875rem 0.25rem 0.1875rem 0.3125rem;
		line-height: 1.15;
		text-align: start;
	}

	.number,
	.block {
		font-family: var(--font-data);
		font-size: 0.625rem;
		color: var(--ink-dim);
	}

	.symbol {
		font-family: var(--font-display);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	/* ponytail: the type scale stops at --text-xs, so the cell name takes one step
	   below it by hand. Swap for a token when the scale grows one. */
	.name {
		font-size: 0.625rem;
		color: var(--ink-dim);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
