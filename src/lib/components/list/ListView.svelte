<script lang="ts">
	import { humanCategory } from '#lib/components/table/model.ts';
	import { elements } from '#lib/data/elements.generated.ts';
	import { NOT_KNOWN, notKnownTitle } from '#lib/format/units.ts';

	// The generated array is already ordered by atomic number, so this list sorts
	// nothing and derives nothing: it is the same data the grid renders, as a
	// document instead of a surface.
	const items = elements;
</script>

<!-- `role="list"` restates what `<ul>` already means, because `list-style: none`
     drops list semantics in some screen readers and this view exists for them. -->
<ul class="list" role="list">
	{#each items as element (element.symbol)}
		{@const phase = element.phase === 'unknown' ? null : element.phase}
		<li class="item">
			<a class="entry" href="/element/{element.symbol}">
				<span class="number">{element.number}</span>
				<span class="symbol">{element.symbol}</span>
				<span class="name">{element.name}</span>
				<span class="category">{humanCategory(element.category)}</span>
				<span class="phase" title={phase === null ? notKnownTitle('phase') : undefined}
					>{phase ?? NOT_KNOWN}</span
				>
			</a>
		</li>
	{/each}
</ul>

<style>
	.list {
		margin: 0;
		padding: 0;
		list-style: none;
		border-block-start: 1px solid var(--line);
	}

	.item {
		border-block-end: 1px solid var(--line);
	}

	/* Flex-wrap rather than columns: at 200 percent text zoom the five fields
	   reflow onto a second line instead of clipping, and nothing is truncated. */
	.entry {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.75rem;
		min-block-size: 2.75rem;
		padding-block: 0.5rem;
		padding-inline: 0.25rem;
		color: var(--ink);
		text-decoration: none;
	}

	/* No hover and no motion: the list is a document, and a document does not
	   move under the pointer. Focus is the one affordance, and it is never
	   removed — only ever drawn. */
	.entry:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}

	.number {
		min-inline-size: 2.5ch;
		font-family: var(--font-data);
		font-size: var(--text-xs);
		color: var(--ink-faint);
		text-align: end;
	}

	.symbol {
		min-inline-size: 2ch;
		font-family: var(--font-display);
		font-size: var(--text-base);
		font-weight: 600;
	}

	.name {
		/* Takes the slack, so category and phase sit as a column at the row's end
		   instead of drifting with the length of each name. */
		flex: 1 1 auto;
		font-size: var(--text-sm);
	}

	.category,
	.phase {
		font-size: var(--text-xs);
		color: var(--ink-dim);
	}

	/* One phase edge down the whole page, whatever the word is. */
	.phase {
		margin-inline-start: auto;
	}
</style>
