<script lang="ts">
	import './layout.css';
	// Side-effect import: keeps `.dark` in sync with the stored choice after
	// hydration. First paint is already correct — src/app.html sets the class from
	// localStorage in a blocking script before anything renders.
	import '#lib/theme.svelte.ts';
	import { initAndroidBack } from '#lib/platform/android.ts';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	// Once for the app, not once per surface. Idempotent, and a no-op off a native
	// shell.
	initAndroidBack();

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
