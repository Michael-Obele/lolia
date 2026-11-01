<script lang="ts">
	import { page } from '$app/state';
	import SettingsDialog from '#lib/components/settings/SettingsDialog.svelte';
	import Grid from '#lib/components/table/Grid.svelte';
	import { elements } from '#lib/data/elements.generated.ts';

	const elementCount = elements.length;

	// `/element/Xx` redirects here with `?missing`. One message, in the interface
	// voice, and nothing else — no stack trace and no apology.
	const missing = $derived(page.url.searchParams.has('missing'));
</script>

<main class="min-h-dvh bg-bg px-4 py-6 text-ink sm:px-6">
	<header
		class="mx-auto mb-6 flex max-w-[68rem] flex-wrap items-center justify-between gap-2"
	>
		<div class="flex flex-wrap items-baseline gap-3">
			<h1 class="font-display text-2xl font-bold tracking-tight">Lolia</h1>
			<p class="font-data text-xs text-ink-faint">{elementCount} elements</p>
		</div>
		<SettingsDialog />
	</header>

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
