<script lang="ts">
	import { page } from '$app/state';
	import SettingsDialog from '#lib/components/settings/SettingsDialog.svelte';
	import { elements } from '#lib/data/elements.generated.ts';
	import { openPalette } from '#lib/search/palette.svelte.ts';

	// The switch is two links, not a toggle with state: the URL is the view, so
	// it deep-links, it prints, and it survives the back button. `/list` is a real
	// route for exactly that reason.
	const views = [
		{ href: '/', label: 'Table' },
		{ href: '/list', label: 'List' }
	];

	const here = $derived(page.url.pathname);
</script>

<!-- Stacked on a phone and one line from 640px up: as a wrapping flex row the
     two groups shrink into each other instead, which put the count under the
     title and the settings trigger under the switch. -->
<header
	class="app-header mx-auto mb-6 flex max-w-272 flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
>
	<div class="flex flex-wrap items-baseline gap-3">
		<h1 class="font-display text-2xl font-bold tracking-tight">Lolia</h1>
		<p class="font-data text-xs text-ink-faint">{elements.length} elements</p>
	</div>

	<!-- Screen-only: a printed sheet has nothing to press. `layout.css` hides
	     this block in `@media print`, which is why it is named here. -->
	<div class="app-controls flex flex-wrap items-center gap-2">
		<nav class="switch" aria-label="View">
			{#each views as view (view.href)}
				<a
					class="view"
					class:current={here === view.href}
					href={view.href}
					aria-current={here === view.href ? 'page' : undefined}>{view.label}</a
				>
			{/each}
		</nav>

		<!-- The visible half of Cmd+K. The shortcut itself lives with the palette,
		     because it also has to work on the routes that have no header. -->
		<button
			type="button"
			class="view"
			aria-keyshortcuts="Meta+K Control+K"
			onclick={openPalette}
		>
			Search
		</button>

		<SettingsDialog />
	</div>
</header>

<style>
	.switch {
		display: flex;
		gap: 0.25rem;
	}

	/* 2.75rem is the same 44 px touch target the settings trigger uses. */
	.view {
		display: inline-flex;
		align-items: center;
		min-block-size: 2.75rem;
		padding-inline: 0.75rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		font-size: var(--text-sm);
		color: var(--ink-dim);
		text-decoration: none;
	}

	/* Bolder ink plus a stated border: the current view is not colour-only. */
	.view.current {
		border-color: var(--ink);
		color: var(--ink);
	}

	.view:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}
</style>
