<script lang="ts">
	// Shells come from the data as electrons per shell, innermost first. Nothing
	// here counts electrons or guesses a configuration: it only arranges them.
	let { shells, symbol, name }: { shells: number[]; symbol: string; name: string } = $props();

	// A 100-unit viewBox: every number below is a share of the drawing, so the SVG
	// still fits its column at any text zoom without a fixed pixel size.
	const CENTRE = 50;
	const OUTER = 46;
	const INNER = 12;

	const rings = $derived.by(() => {
		const count = Math.max(shells.length, 1);
		return shells.map((electrons, index) => {
			const radius = INNER + ((OUTER - INNER) * (index + 1)) / count;
			const dots = Array.from({ length: electrons }, (_, position) => {
				const angle = (2 * Math.PI * position) / electrons - Math.PI / 2;
				return {
					x: CENTRE + radius * Math.cos(angle),
					y: CENTRE + radius * Math.sin(angle)
				};
			});
			return { radius, dots };
		});
	});

	// "Iron: 2, 8, 14, 2 electrons per shell" — the one sentence the diagram is.
	const label = $derived.by(() => {
		const total = shells.reduce((sum, electrons) => sum + electrons, 0);
		return `${name}: ${shells.join(', ')} ${total === 1 ? 'electron' : 'electrons'} per shell`;
	});
</script>

<svg class="diagram" viewBox="0 0 100 100" role="img" aria-label={label}>
	<title>{label}</title>
	{#each rings as ring, index (index)}
		<circle class="ring" cx={CENTRE} cy={CENTRE} r={ring.radius} />
		{#each ring.dots as dot, position (position)}
			<circle class="electron" cx={dot.x} cy={dot.y} r="1.2" />
		{/each}
	{/each}
	<text class="nucleus" x={CENTRE} y={CENTRE} text-anchor="middle" dominant-baseline="central"
		>{symbol}</text
	>
</svg>

<style>
	.diagram {
		display: block;
		inline-size: 100%;
		block-size: auto;
		max-inline-size: 16rem;
		margin-block-start: 0.5rem;
		margin-inline: auto;
	}

	.ring {
		fill: none;
		stroke: var(--line);
		stroke-width: 0.6;
	}

	.electron {
		fill: var(--ink-faint);
	}

	.nucleus {
		fill: var(--ink);
		font-family: var(--font-display);
		font-size: 11px;
		font-weight: 700;
	}
</style>
