<script lang="ts">
	import ListView from '#lib/components/list/ListView.svelte';
	import AppHeader from '#lib/components/shell/AppHeader.svelte';
	import { elements } from '#lib/data/elements.generated.ts';
</script>

<main class="min-h-dvh bg-bg px-4 py-6 text-ink sm:px-6">
	<AppHeader />

	<!-- The heading is the document's, not the list's: it says how many rows
	     follow before the reader starts counting them. -->
	<section class="mx-auto max-w-272" aria-labelledby="list-heading">
		<h2 id="list-heading" class="list-heading">
			{elements.length} elements, by atomic number
		</h2>
		<ListView />
	</section>
</main>

<style>
	.list-heading {
		margin-block-end: 0.75rem;
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 600;
		line-height: 1.2;
	}
</style>
