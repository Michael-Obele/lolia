<script lang="ts">
	import { goto } from '$app/navigation';
	import { Command, Dialog } from 'bits-ui';
	import { closePalette, palette, restoreFocus } from '#lib/search/palette.svelte.ts';
	import { rank } from '#lib/search/rank.ts';
	import ResultList from './ResultList.svelte';

	let query = $state('');
	let field = $state<HTMLInputElement | null>(null);

	// The ranker is the only filter. `shouldFilter={false}` turns off bits-ui's own
	// scoring so two scorers never argue about the order: arrow keys and Enter keep
	// working, because they only ever needed a list of items.
	const matches = $derived(rank(query));
	// A tier 5 row is a category hit, not a name or symbol one. When there is
	// nothing better, the list says why instead of looking like a normal result.
	const hasDirect = $derived(matches.some((match) => match.tier <= 4));

	// Categories that really exist, offered when the query found nothing. A miss is
	// a starting point, not an error.
	const categories = [
		{ label: 'metals', query: 'metal' },
		{ label: 'metalloids', query: 'metalloid' },
		{ label: 'noble gases', query: 'noble' },
		{ label: 'lanthanides', query: 'lanthanide' },
		{ label: 'actinides', query: 'actinide' }
	];

	// Closing forgets the query, so the next open starts from nothing rather than
	// from a search the user abandoned.
	$effect(() => {
		if (!palette.open) query = '';
	});

	// Opened by Cmd+K, the palette was not clicked and the browser has nothing
	// focused to move on from; the field takes focus itself so typing always
	// filters. Re-running on `field` covers the first paint of the dialog.
	$effect(() => {
		if (palette.open && field) field.focus({ preventScroll: true });
	});

	function select(symbol: string) {
		closePalette();
		void goto(`/element/${symbol}`);
	}
</script>

<!-- The body of the palette, loaded from its own chunk. It is mounted a beat
     after first paint (the idle prefetch) or, on a cold first Cmd+K, as soon as
     the chunk lands — never as part of the route graph. The Cmd+K listener that
     opens it lives with the loader in `palette.svelte.ts`, because this file is
     not there yet when the first shortcut is pressed. -->
<Dialog.Root open={palette.open} onOpenChange={(next) => (palette.open = next)}>
	<Dialog.Portal>
		<Dialog.Overlay class="search-scrim" />

		<Dialog.Content
			class="search-palette"
			onCloseAutoFocus={(event) => {
				event.preventDefault();
				restoreFocus();
			}}
		>
			<Dialog.Title class="search-sr">Search elements</Dialog.Title>

			<Command.Root shouldFilter={false} loop label="Element search">
				<Command.Input
					class="search-field"
					bind:value={query}
					placeholder="Name, symbol, category or block"
					aria-label="Search elements"
					bind:ref={field}
				/>

				{#if query.trim() === ''}
					<p class="idle">Type a name, a symbol, a category, or a block.</p>
				{:else if matches.length > 0}
					{#if !hasDirect}
						<p class="aside">
							No name or symbol matches “{query}”. These are the categories that do:
						</p>
					{/if}
					<ResultList {matches} onselect={select} />
				{:else}
					<div class="empty">
						<p>No element matches “{query}”.</p>
						<p class="hint">Try a category:</p>
						<ul class="suggest">
							{#each categories as category (category.query)}
								<li>
									<button
										type="button"
										class="chip"
										onclick={() => (query = category.query)}
									>
										{category.label}
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</Command.Root>

			<p class="keys">
				<span><kbd>↑</kbd><kbd>↓</kbd> move</span>
				<span><kbd>↵</kbd> open</span>
				<span><kbd>esc</kbd> close</span>
			</p>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.search-scrim) {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: var(--bg);
		opacity: 0.7;
	}

	:global(.search-palette) {
		position: fixed;
		inset-inline: 0.75rem;
		inset-block-start: max(12dvh, calc(env(safe-area-inset-top) + 1rem));
		z-index: 50;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface-raised);
	}

	/* Moment 8: it rises 8px and fades in. Enter only — the plan gives the palette
	   no exit beat, and an animation that outlives `data-state="closed"` is what
	   keeps a closed dialog mounted and swallowing clicks. */
	:global(.search-palette[data-state='open']) {
		animation: rise var(--dur-fast) var(--ease-out) both;
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Reduced motion keeps the fade, which is the part that says "something
	   arrived", and drops the travel. */
	@media (prefers-reduced-motion: reduce) {
		:global(.search-palette[data-state='open']) {
			animation-name: fade;
		}
	}

	@media (min-width: 720px) {
		:global(.search-palette) {
			inset-inline: 0;
			margin-inline: auto;
			max-inline-size: 34rem;
		}
	}

	:global(.search-field) {
		min-block-size: 2.75rem;
		padding-inline: 0.5rem;
		border: 0;
		border-block-end: 1px solid var(--line);
		background: none;
		color: var(--ink);
		font-size: var(--text-base);
	}

	:global(.search-field::placeholder) {
		color: var(--ink-dim);
	}

	:global(.search-field:focus) {
		outline: none;
	}

	/* The dialog opens with focus already in this field, and its only affordance is
	   the 1 px underline: while it holds focus that line is ink. */
	:global(.search-field:focus-visible) {
		border-block-end-color: var(--ink);
	}

	.aside {
		padding-inline: 0.5rem;
		font-size: var(--text-xs);
		color: var(--ink-dim);
	}

	.idle,
	.empty {
		padding: 0.75rem 0.5rem;
		font-size: var(--text-sm);
		color: var(--ink-dim);
	}

	.hint {
		margin-block-start: 0.5rem;
		font-size: var(--text-xs);
		color: var(--ink-dim);
	}

	.suggest {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-block-start: 0.5rem;
		padding: 0;
		list-style: none;
	}

	.chip {
		min-block-size: 2.75rem;
		padding-inline: 0.75rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		font-size: var(--text-sm);
	}

	.chip:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}

	.keys {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		padding-inline: 0.5rem;
		font-size: var(--text-xs);
		color: var(--ink-dim);
	}

	kbd {
		padding-inline: 0.25rem;
		border: 1px solid var(--line);
		border-radius: calc(var(--radius) - 4px);
		font-family: var(--font-data);
	}

	/* The title is for screen readers: the input's placeholder is the visible one,
	   and a second visible "Search" would be noise above it. */
	:global(.search-sr) {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
