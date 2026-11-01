<script lang="ts">
	import './layout.css';
	// Side-effect import: restores a stored theme before first paint.
	import '#lib/theme.svelte.ts';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
