<script lang="ts">
	import { Command } from 'bits-ui';
	import { flip } from 'svelte/animate';
	import { motionOk } from '#lib/motion/reduced.ts';
	import { durations } from '#lib/motion/tokens.ts';
	import type { Match } from '#lib/search/rank.ts';

	let { matches, onselect }: { matches: Match[]; onselect: (symbol: string) => void } = $props();

	// Moment 9. `duration: 0` is the reduced-motion path: the rows land in their
	// new slots without travelling there.
	const flipOptions = $derived(motionOk() ? { duration: durations.base.ms } : { duration: 0 });
</script>

<Command.List class="search-rows" aria-label="Elements">
	{#each matches as match (match.element.symbol)}
		<!-- The wrapper is what flips. `presentation` keeps the option a direct
		     child of the listbox in the accessibility tree, and Command.Item renders
		     a `display: contents` box of its own in between. -->
		<div role="presentation" animate:flip={flipOptions}>
			<Command.Item
				class="search-row"
				value={match.element.symbol}
				onSelect={() => onselect(match.element.symbol)}
			>
				<span class="search-symbol">{match.element.symbol}</span>
				<span class="search-name">{match.element.name}</span>
				<span class="search-reason">{match.reason}</span>
			</Command.Item>
		</div>
	{/each}
</Command.List>

<!-- Global because these classes are handed to bits-ui components: the compiler
     cannot see them in this file's markup, and the styles still belong here. -->
<style>
	:global(.search-rows) {
		overflow-y: auto;
		overscroll-behavior: contain;
		max-block-size: 50dvh;
	}

	:global(.search-row) {
		display: grid;
		grid-template-columns: 2.25rem minmax(0, 1fr) auto;
		align-items: baseline;
		gap: 0.5rem;
		min-block-size: 2.75rem;
		padding-inline: 0.5rem;
		border-radius: var(--radius);
		cursor: pointer;
	}

	/* Selected and merely hovered get the same wash on purpose: the keyboard and
	   the pointer are looking at the same row. */
	:global(.search-row[data-selected]),
	:global(.search-row:hover) {
		background: var(--surface);
	}

	:global(.search-row:focus-visible) {
		outline: 2px solid var(--ink);
		outline-offset: -2px;
	}

	:global(.search-symbol) {
		font-family: var(--font-data);
		font-size: var(--text-sm);
		color: var(--ink-faint);
	}

	:global(.search-name) {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.search-reason) {
		font-size: var(--text-xs);
		color: var(--ink-dim);
	}
</style>
