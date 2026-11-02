<script lang="ts">
	import { page } from '$app/state';
	import ElementImage from '#lib/components/inspector/ElementImage.svelte';
	import Stat from '#lib/components/inspector/Stat.svelte';
	import { humanCategory } from '#lib/components/table/model.ts';
	import ScrollArea from '#lib/components/ui/scroll-area/scroll-area.svelte';
	import { getDetail } from '#lib/data/details.ts';
	import { elements } from '#lib/data/elements.generated.ts';
	import type { ElementDetail } from '#lib/data/types.ts';
	import { categoryVar } from '#lib/design/category.ts';
	import {
		NOT_KNOWN,
		densityUnit,
		formatKelvin,
		formatMass,
		formatPlain,
		notKnownTitle
	} from '#lib/format/units.ts';
	import { motionOk } from '#lib/motion/reduced.ts';

	// The generated array is already ordered by atomic number, so this list sorts
	// nothing and derives nothing: it is the same data the grid renders, as a
	// document instead of a surface.
	const items = elements;

	// One row open at a time, and the query string is the way in only. `/list?open=Fe`
	// opens Fe on load; after that the list owns the state, so a click never writes
	// history and never files the reader below `/element/Fe` in the back stack.
	const requested = page.url.searchParams.get('open');
	let open = $state(
		requested === null || !items.some((element) => element.symbol === requested)
			? null
			: requested
	);

	function toggle(symbol: string) {
		open = open === symbol ? null : symbol;
	}

	// The one scroll container here is bits-ui's viewport, so the row is brought
	// back by the browser instead of by arithmetic against an unknown parent.
	let list: HTMLUListElement | undefined = $state();

	function reveal() {
		list?.querySelector<HTMLElement>('.item.open')?.scrollIntoView({ block: 'nearest' });
	}

	// Twice, on purpose: the first call sees the row, and the one after the reveal
	// sees the row plus its detail, which is the part still below the fold when the
	// open row sits at the end of the list.
	function settled(event: TransitionEvent) {
		if (event.propertyName === 'grid-template-rows') reveal();
	}

	$effect(() => {
		if (open !== null) reveal();
	});

	// One open row at a time, so one detail at a time. The row's core fields are
	// already on screen; the rest arrives when the row is opened, which is the
	// first moment this route needs it at all. The symbol travels with the object
	// so an open row can never show the row that was open before it.
	let held = $state<{ symbol: string | null; detail: ElementDetail | null }>({
		symbol: null,
		detail: null
	});

	const detail = $derived(held.symbol === open ? held.detail : null);

	$effect(() => {
		const symbol = open;
		let live = true;

		if (symbol === null) return;

		void getDetail(symbol).then((found) => {
			if (live) held = { symbol, detail: found };
		});

		return () => {
			live = false;
		};
	});

</script>

<!-- The route gives this the height that is left; the list is the one scroll
     region on the page, so the document itself never scrolls under it. -->
<ScrollArea class="min-h-0 flex-1">
	<!-- `role="list"` restates what `<ul>` already means, because `list-style: none`
	     drops list semantics in some screen readers and this view exists for them. -->
	<ul class="list" role="list" bind:this={list} data-motion={motionOk() ? 'on' : 'off'}>
		{#each items as element (element.symbol)}
			{@const isOpen = open === element.symbol}
			{@const phase = element.phase === 'unknown' ? null : element.phase}
			{@const configuration =
				detail?.electronConfigurationSemantic ?? detail?.electronConfiguration ?? null}
			<li class="item" class:open={isOpen} style:--cat={categoryVar(element.category)}>
				<button
					type="button"
					class="entry"
					aria-expanded={isOpen}
					aria-controls="detail-{element.symbol}"
					onclick={() => toggle(element.symbol)}
				>
					<span class="number">{element.number}</span>
					<span class="symbol">{element.symbol}</span>
					<span class="name">{element.name}</span>
					<span class="category">{humanCategory(element.category)}</span>
					<span class="phase" title={phase === null ? notKnownTitle('phase') : undefined}
						>{phase ?? NOT_KNOWN}</span
					>
					<span class="chev" aria-hidden="true">▾</span>
				</button>

				<!-- Always in the document so `aria-controls` resolves, and empty unless
				     this is the open row: one `ElementImage` per element would start 118
				     photo lookups to show at most one. -->
				<div
					class="detail"
					id="detail-{element.symbol}"
					inert={!isOpen}
					ontransitionend={settled}
				>
					<div class="detail-body">
						{#if isOpen}
							<div class="detail-grid">
								<div class="detail-photo">
									<ElementImage {element} image={detail?.image ?? null} />
								</div>
								<dl class="stats">
									<Stat label="symbol" value={element.symbol} />
									<Stat label="name" value={element.name} />
									<Stat label="category" value={humanCategory(element.category)} />
									<Stat label="phase" value={phase} />
									<Stat label="atomic mass" value={formatMass(detail?.mass ?? null)} />
									<Stat
										label="melting point"
										value={formatKelvin(detail?.meltingPoint ?? null)}
									/>
									<Stat
										label="boiling point"
										value={formatKelvin(detail?.boilingPoint ?? null)}
									/>
									<Stat
										label="density"
										value={formatPlain(detail?.density?.value ?? null)}
										unit={densityUnit(detail?.density?.unit ?? null)}
									/>
									<Stat
										label="electronegativity"
										value={formatPlain(detail?.electronegativity ?? null)}
									/>
									<Stat
										label="electron configuration"
										value={configuration}
									/>
								</dl>
								{#if detail?.summary}
									<p class="summary">{detail.summary}</p>
								{:else}
									<p class="summary empty" title={notKnownTitle('summary')}>
										{NOT_KNOWN}
									</p>
								{/if}
								<!-- The only thing in this view that leaves it. -->
								<a class="to-table" href="/element/{element.symbol}">Open in table</a>
							</div>
						{/if}
					</div>
				</div>
			</li>
		{/each}
	</ul>
</ScrollArea>

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

	/* Flex-wrap rather than columns: at 200 percent text zoom the fields reflow
	   onto a second line instead of clipping, and nothing is truncated. It is a
	   button, so the whole row is the control and the whole row is the hit. */
	.entry {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.75rem;
		inline-size: 100%;
		min-block-size: 2.75rem;
		padding-block: 0.5rem;
		/* The category bar is drawn at the start edge, so the text is inset past it
		   once and no glyph moves when the bar thickens. */
		padding-inline: 0.625rem 0.25rem;
		border: 0;
		background: none;
		color: var(--ink);
		font: inherit;
		text-align: start;
		cursor: pointer;
	}

	/* Drawn, not laid out: a border width would shrink the content box by a pixel
	   and shift the row on every hover. */
	.entry::before {
		content: '';
		position: absolute;
		inset-block: 0;
		inset-inline-start: 0;
		inline-size: 3px;
		background: var(--cat);
	}

	/* An open row keeps the surface while it is open, so its detail reads as the
	   same block rather than as a panel that happens to sit under it. */
	.item.open {
		background: var(--surface);
	}

	.item.open .entry::before {
		inline-size: 4px;
	}

	/* Durations come from the token layer, and motion is the reader's choice: with
	   motion off the row still answers, it just arrives without travelling. */
	.list[data-motion='on'] .entry {
		transition:
			transform var(--dur-instant) var(--ease-out),
			background-color var(--dur-fast) var(--ease-out);
	}

	.list[data-motion='on'] .entry::before {
		transition: inline-size var(--dur-fast) var(--ease-out);
	}

	/* Press. The cells take 0.97 of themselves; a row is as wide as the page, so
	   the same ratio would pull a thumb's width off each end and read as a squeeze
	   rather than a tap. One notch less keeps the same feel. */
	.entry:active {
		transform: scale(0.99);
	}

	/* Pointer only, so a hover state cannot stick to a touch screen. */
	@media (hover: hover) {
		.entry:hover {
			background: var(--surface);
		}

		.entry:hover::before {
			inline-size: 4px;
		}
	}

	/* Focus is never removed, only ever drawn. Inset, because the row is full bleed
	   and an outer ring would be clipped by the scroll viewport. */
	.entry:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: -2px;
	}

	.number {
		min-inline-size: 2.5ch;
		font-family: var(--font-data);
		font-size: var(--text-xs);
		/* --ink-faint measured 2.92:1 here; a number is text, so it takes the dim
		   tone that passes at 5.6:1. */
		color: var(--ink-dim);
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

	/* One glyph, turned: it points at the row when the row is closed and at the
	   detail when it is open. The space is held in both states. */
	.chev {
		flex: 0 0 auto;
		min-inline-size: 1ch;
		font-size: var(--text-xs);
		color: var(--ink-dim);
		transform: rotate(-90deg);
	}

	.item.open .chev {
		transform: none;
	}

	.list[data-motion='on'] .chev {
		transition: transform var(--dur-fast) var(--ease-out);
	}

	/* The reveal is a 0fr to 1fr track: it animates to a height nobody measured,
	   which `height: auto` cannot do. The body clips it, and that clipping is also
	   what lets the track reach zero. */
	.detail {
		display: grid;
		grid-template-rows: 0fr;
		opacity: 0;
	}

	.item.open .detail {
		grid-template-rows: 1fr;
		opacity: 1;
	}

	.list[data-motion='on'] .detail {
		transition:
			grid-template-rows var(--dur-base) var(--ease-out),
			opacity var(--dur-instant) var(--ease-out);
	}

	.detail-body {
		overflow: hidden;
		min-block-size: 0;
	}

	.detail-grid {
		display: grid;
		gap: 0.75rem;
		padding: 0.75rem 0.625rem 1rem;
		border-block-start: 1px solid var(--line);
	}

	.detail-photo {
		max-inline-size: 15rem;
	}

	.stats {
		display: grid;
		gap: 0.125rem 1.25rem;
		margin: 0;
	}

	/* Prose is prose: the reading face, and a measure a line can be read at rather
	   than the width of a row. */
	.summary {
		max-inline-size: 62ch;
		margin: 0;
		font-family: var(--font-prose);
		font-size: var(--text-base);
		line-height: 1.55;
	}

	.empty {
		color: var(--ink-dim);
	}

	.to-table {
		justify-self: start;
		display: inline-flex;
		align-items: center;
		min-block-size: 2.75rem;
		padding-inline: 0.75rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		color: var(--ink);
		font-size: var(--text-sm);
		text-decoration: none;
	}

	.to-table:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}

	@media (hover: hover) {
		.to-table:hover {
			background: var(--surface-raised);
		}
	}

	@media (min-width: 560px) {
		.detail-grid {
			grid-template-columns: 12rem minmax(0, 1fr);
		}

		.summary,
		.to-table {
			grid-column: 1 / -1;
		}
	}

	/* Wide enough for two columns of label and value, rather than one pair
	   stretched across half a screen. */
	@media (min-width: 720px) {
		.stats {
			grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		}
	}
</style>
