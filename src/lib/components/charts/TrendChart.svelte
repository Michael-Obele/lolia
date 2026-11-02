<script lang="ts">
	// The only file in the app that imports layerchart, and therefore the only
	// file the table route's chunk graph can reach it through. The route imports
	// this component lazily, so nothing here lands on `/` or `/list`.
	//
	// Imported from `layerchart/svg`, never the agnostic barrel: the SVG build
	// drops the runtime layer dispatch and roughly 8% of the bytes.
	//
	// `ChartCore`, not `Chart`: `Chart` renders a `ChartChildren` wrapper that
	// pulls a default grid, legend, tooltip, brush, annotation and clip-path layer
	// into the chunk whether or not a page asks for them. This page asks for two
	// axes, a line and a point cloud, and names them below — and names its own
	// `Svg` layer, which `ChartChildren` would otherwise have supplied.
	import { Axis, ChartCore, Points, Spline, Svg } from 'layerchart/svg';
	import type { Metric } from '#lib/data/metrics.ts';
	import { categorySlugs, categoryVar } from '#lib/design/category.ts';
	import { easing } from '#lib/motion/easing.ts';
	import { motionOk } from '#lib/motion/reduced.ts';
	import { durations } from '#lib/motion/tokens.ts';

	let { metric }: { metric: Metric } = $props();

	// layerchart takes `duration` as a number and `easing` as a d3 function, which
	// is exactly the pair tokens.ts and easing.ts exist to supply — the same
	// duration the rest of the app uses, in the second of its two forms.
	const motion = $derived(
		motionOk()
			? ({ type: 'tween', duration: durations.slow.ms, easing: easing.out } as const)
			: ('none' as const)
	);

	// The table's palette, index for index. `cDomain` pins the order so the nth
	// colour belongs to the nth category, whatever order the rows arrive in.
	const cRange = categorySlugs.map(categoryVar);
</script>

<!--
	`data`, `x`, `y` and `c` are set once, here, at the chart. Every mark below
	reads them from the chart context. Passing a per-mark accessor instead would
	make the chart lay itself out twice — once for each incomplete domain a single
	mark knows.

	`c` also splits the lines: with no `g`, `Spline` groups by the chart's colour
	column, so one category is one line and one colour. One metric's rows, one
	column for the category, no pivot and no `series`.

	`data-motion` states which way the reduced-motion gate went, the way the grid
	states it: one attribute to read instead of timing an animation to find out.
-->
<div class="plot" data-motion={motionOk() ? 'ok' : 'off'}>
	<ChartCore
		data={metric.rows}
		x="atomicNumber"
		y="value"
		c="category"
		{cRange}
		cDomain={categorySlugs}
		padding={{ top: 8, right: 8, bottom: 28, left: 44 }}
	>
		<Svg>
			<Axis placement="left" format={(value) => metric.tick(value)} />
			<Axis placement="bottom" tickSpacing={64} format={(value) => String(value)} />

			<!-- The tween is the reveal: a line grows out of the baseline on mount and
			     slides to its new shape when the metric changes. Under reduced motion
			     `motion` is `'none'`, so the same marks paint at rest with no draw. -->
			<Spline {motion} />
			<Points r={2.5} {motion} />
		</Svg>
	</ChartCore>
</div>

<style>
	/* layerchart's root container is 100% by 100%, so the height has to come from
	   here. Shorter on a phone so the switcher and the legend stay on screen. */
	.plot {
		block-size: 18rem;
	}

	@media (min-width: 640px) {
		.plot {
			block-size: 22rem;
		}
	}

	/* The tick labels are data, not prose: they take the data face and the dim
	   ink so the lines stay the loudest thing in the box. layerchart paints its
	   labels with a fill attribute, so this has to name the label class rather
	   than set `fill` on the axis group, which the attribute would win against. */
	.plot :global(.lc-axis-tick-label) {
		font-family: var(--font-data);
		font-size: var(--text-xs);
		fill: var(--ink-dim);
	}

	/* The 4px tick marks and the domain rule, at the same weight as every other
	   hairline in the app. */
	.plot :global(.lc-axis-tick),
	.plot :global(.lc-axis-rule) {
		stroke: var(--line);
	}
</style>
