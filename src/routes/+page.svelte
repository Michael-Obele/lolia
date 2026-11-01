<script lang="ts">
	// Placeholder screen for milestone M0, now proving M1: the count comes from
	// the generated data, so nothing here knows how many elements exist.
	// The real grid arrives in M2; colour comes from the design tokens.
	import { elements } from '#lib/data/elements.generated.ts';

	const elementCount = elements.length;
</script>

<main class="grid min-h-dvh place-items-center bg-bg text-ink">
	<div class="text-center">
		<h1 class="font-mono text-6xl tracking-tight">Lolia</h1>
		<p class="mt-3 text-sm text-ink-dim">The periodic table, made to be looked at.</p>
		<p class="mt-10 font-mono text-xs uppercase tracking-widest text-ink-faint">
			{elementCount} elements
		</p>
	</div>
</main>
