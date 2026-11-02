<script lang="ts">
	import ComparePanel from '#lib/components/compare/ComparePanel.svelte';
	import { tray } from '#lib/components/compare/tray.svelte.ts';
	import AppHeader from '#lib/components/shell/AppHeader.svelte';
</script>

<main class="flex h-dvh flex-col bg-bg px-4 py-6 text-ink sm:px-6">
	<AppHeader />

	<!-- A column that owns the height the header leaves, so the panel is the only
	     scroll region and the page itself never scrolls under a sticky header. -->
	<section
		class="mx-auto flex min-h-0 w-full max-w-272 flex-1 flex-col"
		aria-labelledby="compare-heading"
	>
		<h2 id="compare-heading" class="compare-heading">
			Compare
			{#if tray.visible.length > 0}
				<span class="count">{tray.visible.length} of {tray.cap}</span>
			{/if}
		</h2>
		<ComparePanel />
	</section>
</main>

<style>
	.compare-heading {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-block-end: 0.75rem;
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 600;
		line-height: 1.2;
	}

	.count {
		font-family: var(--font-data);
		font-size: var(--text-xs);
		font-weight: 400;
		color: var(--ink-dim);
	}
</style>
