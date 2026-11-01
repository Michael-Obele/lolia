<script lang="ts">
	import Sheet from '#lib/components/sheet/Sheet.svelte';
	import Grid from '#lib/components/table/Grid.svelte';
	import { elements } from '#lib/data/elements.generated.ts';
	import type { PageProps } from './$types';

	// The load proved the symbol resolves, so this page always has an element.
	let { data }: PageProps = $props();

	const elementCount = elements.length;
</script>

<main class="min-h-dvh bg-bg px-4 py-6 text-ink sm:px-6">
	<header class="shell mb-6 flex flex-wrap items-baseline justify-between gap-2">
		<h1 class="font-display text-2xl font-bold tracking-tight">Lolia</h1>
		<p class="font-data text-xs text-ink-faint">{elementCount} elements</p>
	</header>

	<div class="stage shell">
		<!-- One wrapper, because Grid is two root nodes (the table and the legend)
		     and a component does not become a single grid item on its own. -->
		<div class="table-slot">
			<Grid />
		</div>
		<Sheet element={data.element} />
	</div>
</main>

<style>
	/* Wider than the table page's 68rem: the 18 columns plus the panel need the
	   room, and at 1280 that is what keeps the table from panning. */
	.shell {
		max-inline-size: 84rem;
		margin-inline: auto;
	}

	/* The table keeps the full width on a phone — the sheet floats over it. One
	   breakpoint, the same 720 px the sheet switches at, and the two columns
	   appear together. */
	.stage {
		display: grid;
		gap: 1rem;
	}

	.table-slot {
		min-inline-size: 0;
	}

	@media (min-width: 720px) {
		.stage {
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: start;
		}
	}
</style>
