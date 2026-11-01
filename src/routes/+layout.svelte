<script lang="ts">
	import './layout.css';
	// Side-effect import: keeps `.dark` in sync with the stored choice after
	// hydration. First paint is already correct — src/app.html sets the class from
	// localStorage in a blocking script before anything renders.
	import '#lib/theme.svelte.ts';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
