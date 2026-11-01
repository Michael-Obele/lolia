<script lang="ts">
	// Placeholder screen for milestone M0, now proving M1: the count comes from
	// the generated data, so nothing here knows how many elements exist.
	// The real grid arrives in M2, and these hex values become design tokens in M3.
	import { elements } from '#lib/data/elements.generated.ts';

	const elementCount = elements.length;
</script>

<main class="grid min-h-dvh place-items-center bg-[#161110] text-[#F6EDE2]">
	<div class="text-center">
		<h1 class="font-mono text-6xl tracking-tight">Lolia</h1>
		<p class="mt-3 text-sm text-[#A99C90]">The periodic table, made to be looked at.</p>
		<p class="mt-10 font-mono text-xs uppercase tracking-widest text-[#6E635B]">
			{elementCount} elements
		</p>
	</div>
</main>
