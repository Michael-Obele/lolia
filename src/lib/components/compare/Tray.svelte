<script lang="ts">
	import { page } from '$app/state';
	import { Spring } from 'svelte/motion';
	import { elements } from '#lib/data/elements.generated.ts';
	import type { ElementCategory } from '#lib/data/types.ts';
	import { categoryVar } from '#lib/design/category.ts';
	import { travel } from '#lib/motion/flip.ts';
	import { motionOk } from '#lib/motion/reduced.ts';
	import { springs } from '#lib/motion/tokens.ts';
	import { tray } from './tray.svelte.ts';

	const names = new Map(elements.map((element) => [element.symbol, element.name]));

	// The chip's own hue, so a hover says which element it is in colour as well as
	// in letters. The slug, not a colour: the token layer owns the values.
	const categories = new Map<string, ElementCategory>(
		elements.map((element) => [element.symbol, element.category])
	);

	// `/compare` is the tray with room to breathe, and it carries its own remove
	// controls. Floating a second copy of it there would cover the table it opens.
	const onCompare = $derived(page.url.pathname === '/compare');

	let dock = $state<HTMLElement>();

	// Moment 18. One spring, retargeted: the badge jumps to 1.2 and the spring
	// brings it home. Reduced motion sets the number and moves nothing.
	const pop = new Spring(1, springs.pop);

	$effect(() => {
		// Reading the length is the whole subscription.
		void tray.symbols.length;
		if (!motionOk()) {
			pop.set(1, { instant: true });
			return;
		}
		pop.set(1.2, { instant: true });
		pop.set(1);
	});

	// Moment 17. `travel` builds the aria-hidden, pointerless ghost; this only
	// decides whether there is a slot to fly to yet. On the first add the dock does
	// not exist until the tray renders, which is why `dock` is a dependency too.
	$effect(() => {
		const from = tray.pending;
		if (!from || !dock || !motionOk()) return;
		tray.pending = null;
		travel(from, dock, () => {});
	});
</script>

{#if tray.symbols.length > 0 && !onCompare}
	<aside
		class="tray"
		aria-label="Compare tray"
		data-motion={motionOk() ? 'ok' : 'off'}
		bind:this={dock}
	>
		<div class="head">
			<p class="badge" style:transform={`scale(${pop.current})`} aria-hidden="true">
				{tray.visible.length}
			</p>
			<!-- The count is the announcement. The chips below are talkative and
			     would drown it out, so only this changes inside the live region. -->
			<p class="count" role="status">
				{tray.visible.length} of {tray.cap} elements compared
			</p>
		</div>

		<!-- Every chip is one destination: the compare view. The element pages are
		     a column header away from there, and a tray of four links to four
		     different pages would be a menu wearing a tray's clothes. -->
		<ul class="chips">
			{#each tray.visible as symbol (symbol)}
				<li class="chip" style:--cat={categoryVar(categories.get(symbol) ?? 'unknown')}>
					<a class="jump" href="/compare">{symbol}</a>
					<button
						type="button"
						class="drop"
						aria-label="Remove {names.get(symbol) ?? symbol} from the compare tray"
						onclick={() => tray.remove(symbol)}
					>
						<span aria-hidden="true">×</span>
					</button>
				</li>
			{/each}
		</ul>

		<!-- A tray collected on a wider screen shows what fits here and says what
		     it is holding back, rather than silently dropping elements. -->
		{#if tray.hidden > 0}
			<p class="count" role="status">
				{tray.hidden} more {tray.hidden === 1 ? 'element is' : 'elements are'} in the tray and not shown
				at this width.
			</p>
		{/if}

		<!-- A refusal is a sentence, not a silence: it appears where the tray is and
		     is announced when it does. -->
		{#if tray.refusal}
			<p class="refusal" role="status">{tray.refusal}</p>
		{/if}
	</aside>
{/if}

<style>
	.tray {
		position: fixed;
		/* 19 keeps it over the table and under the sheet's dim (20), so a raised
		   sheet recedes it instead of fighting it. */
		z-index: 19;
		inset-inline-end: max(0.5rem, env(safe-area-inset-right));
		/* A phone puts it at the top: the sheet owns the bottom of the screen, so a
		   bottom dock would be the one thing the sheet covers. From 720px up the
		   sheet is a side panel and the bottom corner is free again. */
		inset-block-start: max(0.5rem, env(safe-area-inset-top));
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		/* A definite width, not shrink-to-fit: the sentence has to wrap inside the
		   box rather than push it past the padding, which is what a max-content
		   width plus auto insets does. */
		inline-size: min(15rem, calc(100vw - 1rem));
		padding: 0.5rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface-raised);
		color: var(--ink);
	}

	/* From 720px up the sheet becomes a panel in the trailing column, so the
	   bottom-right corner belongs to it (z 21, above this dock). The leading corner
	   is the one that stays free. */
	@media (min-width: 720px) {
		.tray {
			inset-block-start: auto;
			inset-block-end: max(0.5rem, env(safe-area-inset-bottom));
			inset-inline-start: max(0.5rem, env(safe-area-inset-left));
			inset-inline-end: auto;
		}
	}

	.head {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.badge {
		display: grid;
		place-items: center;
		min-inline-size: 1.25rem;
		block-size: 1.25rem;
		border-radius: 999px;
		background: var(--ink);
		color: var(--bg);
		font-family: var(--font-data);
		font-size: var(--text-xs);
	}

	.count,
	.refusal {
		font-size: var(--text-xs);
		color: var(--ink-dim);
	}

	.refusal {
		color: var(--ink);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.chip {
		display: flex;
		align-items: center;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		/* `overflow: hidden` keeps the two halves inside the rounded corner, and the
		   chip's own surface is what the tint is mixed into. */
		overflow: hidden;
		background: var(--surface-raised);
		transition:
			transform var(--dur-fast) var(--ease-out),
			border-color var(--dur-fast) var(--ease-out),
			background-color var(--dur-fast) var(--ease-out);
	}

	/* Pointer only: on touch a lift sticks until the next tap. One chip at a time —
	   the row itself never moves. */
	@media (hover: hover) {
		.chip:hover {
			transform: translateY(-2px);
			border-color: color-mix(in oklab, var(--cat) 72%, var(--ink));
			background-color: color-mix(in oklab, var(--cat) 14%, var(--surface-raised));
		}
	}

	/* Moment 2's reduced alternative, applied to the chip: the colour still answers
	   the pointer, nothing lifts. */
	.tray[data-motion='off'] .chip {
		transition: none;
	}

	@media (hover: hover) {
		.tray[data-motion='off'] .chip:hover {
			transform: none;
		}
	}

	.jump {
		display: inline-flex;
		align-items: center;
		min-block-size: 2.75rem;
		padding-inline: 0.5rem;
		color: var(--ink);
		font-family: var(--font-data);
		font-size: var(--text-sm);
		text-decoration: none;
	}

	.drop {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-block-size: 2.75rem;
		min-inline-size: 2rem;
		border: 0;
		border-inline-start: 1px solid var(--line);
		background: none;
		color: var(--ink-dim);
		font-size: var(--text-base);
	}

	/* No background of its own: the chip behind it already carries the hover, and a
	   second wash would leave the two halves disagreeing mid-lift. */
	.drop:hover {
		color: var(--ink);
	}

	.jump:focus-visible,
	.drop:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: -2px;
	}
</style>
