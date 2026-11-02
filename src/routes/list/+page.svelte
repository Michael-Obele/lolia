<script lang="ts">
	import ListView from '#lib/components/list/ListView.svelte';
	import AppHeader from '#lib/components/shell/AppHeader.svelte';
	import { elements } from '#lib/data/elements.generated.ts';
</script>

<main class="flex h-dvh flex-col bg-bg px-4 py-6 text-ink sm:px-6">
	<AppHeader />

	<!-- A column that owns the height the header leaves, so the list is the only
	     scroll region on this page and the document never scrolls under it. -->
	<section
		class="mx-auto flex min-h-0 w-full max-w-272 flex-1 flex-col"
		aria-labelledby="list-heading"
	>
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
