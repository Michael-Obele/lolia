<script lang="ts">
	import { page } from '$app/state';
	import AppHeader from '#lib/components/shell/AppHeader.svelte';
	import Grid from '#lib/components/table/Grid.svelte';

	// `/element/Xx` redirects here with `?missing`. One message, in the interface
	// voice, and nothing else — no stack trace and no apology.
	const missing = $derived(page.url.searchParams.has('missing'));
</script>

<main class="min-h-dvh bg-bg px-4 py-6 text-ink sm:px-6">
	<AppHeader />

	{#if missing}
		<p class="message" role="status">That element could not be shown.</p>
	{/if}

	<Grid />
</main>

<style>
	.message {
		max-inline-size: 68rem;
		margin-inline: auto;
		margin-block-end: 1rem;
		font-size: var(--text-sm);
		color: var(--ink-dim);
	}
</style>
