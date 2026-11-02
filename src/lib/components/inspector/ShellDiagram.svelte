<script lang="ts">
	import { motionOk } from '#lib/motion/reduced.ts';
	import { stagger } from '#lib/motion/stagger.ts';

	// Shells come from the data as electrons per shell, innermost first. Nothing
	// here counts electrons or guesses a configuration: it only arranges them.
	let { shells, symbol, name }: { shells: number[]; symbol: string; name: string } = $props();

	// A 100-unit viewBox: every number below is a share of the drawing, so the SVG
	// still fits its column at any text zoom without a fixed pixel size.
	const CENTRE = 50;
	const OUTER = 46;
	const INNER = 12;

	// Moment 15. The draw is CSS, so this only supplies what the stylesheet cannot
	// know: each ring's circumference and its place in the queue, and each
	// electron's delay. The durations and the easing stay in the stylesheet, where
	// they are the tokens.
	const rings = $derived.by(() => {
		const count = Math.max(shells.length, 1);
		let electron = 0;
		return shells.map((electrons, index) => {
			const radius = INNER + ((OUTER - INNER) * (index + 1)) / count;
			const dots = Array.from({ length: electrons }, (_, position) => {
				const angle = (2 * Math.PI * position) / electrons - Math.PI / 2;
				return {
					x: CENTRE + radius * Math.cos(angle),
					y: CENTRE + radius * Math.sin(angle),
					// Innermost shell first, one cloud arriving as one sweep.
					delay: stagger(electron++, 'shell')
				};
			});
			return { radius, index, dash: 2 * Math.PI * radius, dots };
		});
	});

	// "Iron: 2, 8, 14, 2 electrons per shell" — the one sentence the diagram is.
	const label = $derived.by(() => {
		const total = shells.reduce((sum, electrons) => sum + electrons, 0);
		return `${name}: ${shells.join(', ')} ${total === 1 ? 'electron' : 'electrons'} per shell`;
	});
</script>

<!--
	One image, not a pile of announced shapes: the rings and dots are inert
	geometry, and the `<title>` plus `aria-label` are the whole reading.

	`data-motion` is the gate, the way the grid and the chart state theirs. It
	also drives the animation: the draw is declared under `[data-motion='ok']`
	only, so the reduced path has no animation to cancel and no dash array to undo
	— the rings paint solid and the electrons are simply there.
-->
<svg
	class="diagram"
	viewBox="0 0 100 100"
	role="img"
	aria-label={label}
	data-motion={motionOk() ? 'ok' : 'off'}
>
	<title>{label}</title>
	{#each rings as ring (ring.index)}
		<circle
			class="ring"
			cx={CENTRE}
			cy={CENTRE}
			r={ring.radius}
			style:--dash={ring.dash}
			style:--ring={ring.index}
		/>
		{#each ring.dots as dot, position (position)}
			<circle class="electron" cx={dot.x} cy={dot.y} r="1.2" style:--delay={dot.delay} />
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

	/* Rings draw in order: a quarter of the orbit each, so four shells end inside
	   the 600 ms moment. The step is the instant token, not a number of its own. */
	.diagram[data-motion='ok'] .ring {
		stroke-dasharray: var(--dash);
		animation: ring-draw var(--dur-slow) var(--ease-in-out) both;
		animation-delay: calc(var(--ring) * var(--dur-instant));
	}

	/* Electrons land one at a time. The stagger is capped in `stagger.ts`, so the
	   twenty-sixth arrives with the fifteenth rather than a second later. */
	.diagram[data-motion='ok'] .electron {
		transform-box: fill-box;
		transform-origin: center;
		animation: electron-in var(--dur-fast) var(--ease-out) both;
		animation-delay: var(--delay);
	}

	@keyframes ring-draw {
		from {
			stroke-dashoffset: var(--dash);
		}

		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes electron-in {
		from {
			opacity: 0;
			transform: scale(0.4);
		}

		to {
			opacity: 1;
			transform: none;
		}
	}

	.nucleus {
		fill: var(--ink);
		font-family: var(--font-display);
		font-size: 11px;
		font-weight: 700;
	}
</style>
