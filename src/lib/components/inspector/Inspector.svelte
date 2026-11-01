<script lang="ts">
	import { goto } from '$app/navigation';
	import { humanCategory } from '#lib/components/table/model.ts';
	import type { Element } from '#lib/data/types.ts';
	import {
		NOT_KNOWN,
		decimal,
		densityUnit,
		formatKelvin,
		formatMass,
		formatPicometres,
		formatPlain,
		notKnownTitle
	} from '#lib/format/units.ts';
	import { takeOrigin, travel } from '#lib/motion/flip.ts';
	import { motionOk } from '#lib/motion/reduced.ts';
	import { stagger } from '#lib/motion/stagger.ts';
	import ShellDiagram from './ShellDiagram.svelte';
	import Stat from './Stat.svelte';

	let { element }: { element: Element } = $props();

	let header: HTMLElement | undefined = $state();
	let heading: HTMLHeadingElement | undefined = $state();

	// Measured on the cell at pointer down, on a wide screen, with motion welcome.
	// Present means this panel was opened by a pointer, so a ghost is the honest
	// way in; absent means keyboard or touch, where the fade is.
	const origin = takeOrigin();
	const enter = origin ? 'ghost' : motionOk() ? 'fade' : null;

	// The panel is not shown until the wash has landed. It never animates itself.
	let shown = $state(origin === null);
	let travelled = false;

	$effect(() => {
		if (travelled || !origin || !header) return;
		travelled = true;
		travel(origin, header, () => (shown = true));
	});

	// The panel is not a dialog: nothing is trapped, the close control is a real
	// link back to the table, and Escape does what the link does. The listener is
	// attached by hand because `svelte:window` did not receive a trusted Escape
	// here, and a key that sometimes does nothing is worse than four extra lines.
	$effect(() => {
		const onkeydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') goto('/');
		};
		window.addEventListener('keydown', onkeydown);
		return () => window.removeEventListener('keydown', onkeydown);
	});

	// Opening the panel moves focus to its heading, so a keyboard Enter on a cell
	// lands somewhere with a name instead of back at the top of the document.
	// Waiting for `shown` keeps the ghost path from aiming focus at a heading that
	// is still invisible, and `preventScroll` keeps the page behind it still.
	$effect(() => {
		if (shown && element.symbol && heading) heading.focus({ preventScroll: true });
	});

	const configuration = $derived(
		element.electronConfigurationSemantic ?? element.electronConfiguration
	);

	const ionization = $derived(
		element.ionizationEnergies.length
			? element.ionizationEnergies.map((value) => decimal(value, 3)).join(', ')
			: null
	);

	// `unknown` is the data saying it does not know, which is a null in the UI.
	const phase = $derived(element.phase === 'unknown' ? null : element.phase);

	const radii = $derived([
		{ label: 'empirical radius', value: element.radii.empirical },
		{ label: 'calculated radius', value: element.radii.calculated },
		{ label: 'van der Waals radius', value: element.radii.vanDerWaals },
		{ label: 'covalent radius, single bond', value: element.radii.covalentSingle },
		{ label: 'covalent radius, triple bond', value: element.radii.covalentTriple },
		{ label: 'metallic radius', value: element.radii.metallic }
	]);
</script>

<!-- Named for the element, not for the component: a screen reader user hears
     "Iron, symbol Fe" when the panel opens. -->
<section
	class="panel"
	class:shown
	data-enter={enter}
	aria-label="{element.name}, symbol {element.symbol}"
>
	<header class="head" bind:this={header}>
		<div class="ident">
			<p class="index">{element.number}</p>
			<p class="symbol">{element.symbol}</p>
		</div>
		<div class="titles">
			<h2 class="name" tabindex="-1" bind:this={heading}>{element.name}</h2>
			<p class="category">{humanCategory(element.category)}</p>
		</div>
		<a class="close" href="/">Close</a>
	</header>

	<div class="body" class:swap={motionOk()}>
		<!-- Keyed by the symbol, so a change of selection remounts the groups and
		     the staggered swap replays; the block stays at one indent depth so the
		     diff of adding it is two lines rather than ninety. -->
		{#key element.symbol}
		<section class="group" style:--delay={stagger(0, 'content')}>
			<h3 class="legend">identity</h3>
			<dl>
				<Stat label="atomic number" value={formatPlain(element.number)} />
				<Stat label="category" value={humanCategory(element.category)} />
				<Stat label="block" value={element.block} />
				<Stat label="group" value={formatPlain(element.group)} />
				<Stat label="period" value={formatPlain(element.period)} />
				<Stat label="phase" value={phase} />
			</dl>
		</section>

		<section class="group" style:--delay={stagger(1, 'content')}>
			<h3 class="legend">physical</h3>
			<dl>
				<Stat label="atomic mass" value={formatMass(element.mass)} />
				<Stat
					label="density"
					value={formatPlain(element.density?.value ?? null)}
					unit={densityUnit(element.density?.unit ?? null)}
				/>
				<Stat label="melting point" value={formatKelvin(element.meltingPoint)} />
				<Stat label="boiling point" value={formatKelvin(element.boilingPoint)} />
				<Stat label="electronegativity" value={formatPlain(element.electronegativity)} />
				<Stat label="electron affinity" value={formatPlain(element.electronAffinity)} />
			</dl>
		</section>

		<section class="group" style:--delay={stagger(2, 'content')}>
			<h3 class="legend">atomic</h3>
			<dl>
				<Stat
					label="electrons per shell"
					value={element.shells.length ? element.shells.join(', ') : null}
				/>
				<Stat label="electron configuration" value={configuration} />
				<Stat label="ionization energies" value={ionization} />
				{#each radii as row (row.label)}
					<Stat label={row.label} value={formatPicometres(row.value)} />
				{/each}
			</dl>
			<ShellDiagram shells={element.shells} symbol={element.symbol} name={element.name} />
		</section>

		<section class="group" style:--delay={stagger(3, 'content')}>
			<h3 class="legend">history</h3>
			<dl>
				<Stat label="discovered by" value={element.discoveredBy} />
				<Stat label="named by" value={element.namedBy} />
				<div class="source-row">
					<dt>source</dt>
					<dd>
						{#if element.source}
							<a href={element.source}>Wikipedia</a>
						{:else}
							<span class="empty" title={notKnownTitle('source')}>{NOT_KNOWN}</span>
						{/if}
					</dd>
				</div>
			</dl>
		</section>

		<section class="group" style:--delay={stagger(4, 'content')}>
			{#if element.summary}
				<p class="summary">{element.summary}</p>
			{:else}
				<p class="summary empty" title={notKnownTitle('summary')}>{NOT_KNOWN}</p>
			{/if}
			<!-- The licence lives on /about; repeating it here would be the third copy. -->
			<p class="attrib"><a href="/about">Attribution</a></p>
		</section>
		{/key}
	</div>
</section>

<style>
	/*
	 * Placement belongs to whoever holds the panel: on a phone that is the sheet,
	 * above the breakpoint it is the grid column beside the table. The panel
	 * itself is only a column that fills its box, so neither side has to know
	 * about the other's positioning.
	 */
	.panel {
		display: flex;
		flex-direction: column;
		/* The flex remainder, not 100%: a percentage height resolved a few pixels
		   taller than the sheet's content box and pushed the last line into the
		   safe-area padding. */
		flex: 1 1 auto;
		min-block-size: 0;
		/* At the lowest snap on a short phone the scroller cannot shrink past its
		   own 28 px of padding, so it overhangs by a few pixels. Clip it: the sheet
		   keeps the home bar clear and the scroll area ends at the inset. */
		overflow: hidden;
		background: var(--surface-raised);
	}

	/* The panel never animates: it arrives. On a pointer the ghost has just
	   travelled into this header and the panel is simply there; from a keyboard
	   there is no rectangle to come from, so the panel is the moving thing and it
	   fades. Nothing is ever half-readable between the two states. */
	.panel[data-enter='fade'] {
		animation: panel-in var(--dur-fast) var(--ease-out) both;
	}

	.panel[data-enter='ghost']:not(.shown) {
		visibility: hidden;
	}

	@keyframes panel-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (min-width: 720px) {
		.panel {
			position: sticky;
			inset-block: 1rem auto;
			inset-inline: auto;
			/* A definite width, not a percentage: the panel sits in an `auto` grid
			   track, and a percentage there makes the track size to the prose. */
			inline-size: 20rem;
			max-inline-size: 100%;
			block-size: auto;
			max-block-size: calc(100dvh - 2rem);
			border: 1px solid var(--line);
			border-radius: var(--radius);
		}
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 0.5rem 0.75rem;
		padding: 0.25rem 1rem 0.75rem;
		border-block-end: 1px solid var(--line);
	}

	.ident {
		text-align: center;
	}

	.index,
	.symbol {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
	}

	.index {
		font-size: var(--text-xs);
		color: var(--ink-faint);
	}

	.symbol {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		font-weight: 700;
		line-height: 1;
	}

	.titles {
		flex: 1 1 8rem;
		min-inline-size: 0;
	}

	.name {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 600;
		line-height: 1.1;
		overflow-wrap: break-word;
	}

	.name:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}

	.category {
		font-size: var(--text-sm);
		color: var(--ink-dim);
	}

	.close {
		display: grid;
		place-items: center;
		min-block-size: 2.75rem;
		min-inline-size: 2.75rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		color: var(--ink);
		font-size: var(--text-sm);
		text-decoration: none;
	}

	/* Below the breakpoint the sheet's handle owns the only close control, so the
	   panel does not repeat it. */
	@media (max-width: 719.98px) {
		.close {
			display: none;
		}
	}

	.close:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}

	/* The only scroll container in the app: overscroll stays inside it, so reading
	   the panel never moves the table behind it. */
	.body {
		min-block-size: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 0.75rem 1rem 1rem;
	}

	dl {
		margin: 0;
	}

	.source-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0 0.75rem;
	}

	.source-row dt {
		flex: 0 1 auto;
		min-inline-size: 0;
		color: var(--ink-dim);
		font-size: var(--text-sm);
	}

	.source-row dd {
		flex: 1 1 auto;
		min-inline-size: min-content;
		margin: 0;
		font-size: var(--text-sm);
		text-align: end;
		overflow-wrap: break-word;
	}

	.group + .group {
		margin-block-start: 1rem;
		padding-block-start: 1rem;
		border-block-start: 1px solid var(--line);
	}

	/* A new selection swaps the contents, it never replaces them in one frame:
	   each group fades up 20 ms after the one above it, capped so a longer panel
	   does not grow a longer wait. */
	.swap .group {
		animation: group-in var(--dur-fast) var(--ease-out) var(--delay) both;
	}

	@keyframes group-in {
		from {
			opacity: 0;
			transform: translateY(0.5rem);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	.legend {
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-faint);
		margin-block-end: 0.375rem;
	}

	.summary {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		line-height: 1.55;
	}

	.attrib {
		margin-block-start: 0.5rem;
		font-size: var(--text-sm);
	}

	.empty {
		color: var(--ink-faint);
	}

	a {
		color: var(--ink);
	}
</style>
