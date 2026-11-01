<script lang="ts">
	import Grid from '#lib/components/table/Grid.svelte';
	import { elements } from '#lib/data/elements.generated.ts';

	const elementCount = elements.length;
</script>

<main class="min-h-dvh bg-bg px-4 py-6 text-ink sm:px-6">
	<header
		class="mx-auto mb-6 flex max-w-[68rem] flex-wrap items-baseline justify-between gap-2"
	>
		<h1 class="font-display text-2xl font-bold tracking-tight">Lolia</h1>
		<p class="font-data text-xs text-ink-faint">{elementCount} elements</p>
	</header>

	<Grid />
</main>
