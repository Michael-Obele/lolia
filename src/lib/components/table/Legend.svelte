<script lang="ts">
	import type { Element } from '#lib/data/types.ts';
	import { categoryVar } from '#lib/design/category.ts';
	import { humanCategory } from './model.ts';

	let { elements }: { elements: Element[] } = $props();

	// First appearance in atomic order, not alphabetical: the legend then reads
	// the way a newcomer meets the categories while scanning the table.
	const categories = $derived([...new Set(elements.map((e) => e.category))]);
</script>

<ul class="legend">
	{#each categories as category (category)}
		<li class="entry">
			<span
				class="swatch"
				style:background={categoryVar(category)}
				aria-hidden="true"
			></span>
			<span>{humanCategory(category)}</span>
		</li>
	{/each}
</ul>

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.125rem;
		margin-block-start: 1rem;
		padding: 0;
		list-style: none;
		font-size: 0.625rem;
		color: var(--ink-dim);
	}

	.entry {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.swatch {
		inline-size: 3px;
		block-size: 0.875rem;
	}
</style>
