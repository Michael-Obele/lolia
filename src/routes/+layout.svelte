<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	// Side-effect import: keeps `.dark` in sync with the stored choice after
	// hydration. First paint is already correct — src/app.html sets the class from
	// localStorage in a blocking script before anything renders.
	import '#lib/theme.svelte.ts';
	import { initAndroidBack } from '#lib/platform/android.ts';
	import { initPalette, paletteBody } from '#lib/search/palette.svelte.ts';
	import Tray from '#lib/components/compare/Tray.svelte';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	// Once for the app, not once per surface. Idempotent, and a no-op off a native
	// shell.
	initAndroidBack();

	// The palette body is a lazy chunk, so its trigger and its shortcut cannot be
	// registered from inside it: they are wired here, then warm the chunk on idle.
	onMount(initPalette);

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<!-- Both are app-wide, not page chrome: Cmd+K has to work on the element route,
     which has its own header, and the tray outlives the route that opened it. -->
<Tray />

<!-- The palette body arrives from its own chunk a couple of frames after paint,
     or on the first Cmd+K if that somehow comes first. Nothing is rendered in
     between: an empty shell here would only cost the initial load more. -->
{#if paletteBody.current}
	{@const Palette = paletteBody.current}
	<Palette />
{/if}
