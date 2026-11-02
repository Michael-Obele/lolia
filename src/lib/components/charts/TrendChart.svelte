<script lang="ts">
	// The only file in the app that imports layerchart, and therefore the only
	// file the table route's chunk graph can reach it through. The route imports
	// this component lazily, so nothing here lands on `/` or `/list`.
	//
	// Imported from `layerchart/svg`, never the agnostic barrel: the SVG build
	// drops the runtime layer dispatch and roughly 8% of the bytes.
	//
	// `ChartCore`, not `Chart`: `Chart` renders a `ChartChildren` wrapper that
	// pulls a default grid, legend, brush, annotation and clip-path layer into the
	// chunk whether or not a page asks for them. This page asks for two axes, a
	// line, a point cloud and one tooltip, and names them below — and names its own
	// `Svg` layer, which `ChartChildren` would otherwise have supplied.
	import { Axis, ChartCore, Points, Spline, Svg, Tooltip } from 'layerchart/svg';
	import { humanCategory } from '#lib/components/table/model.ts';
	import type { Metric, TrendRow } from '#lib/data/metrics.ts';
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

	// Where each element sits in the metric it is plotted in, so two points can be
	// compared without reading the axis. Keyed by atomic number rather than by
	// row, because the tooltip is handed the row it found.
	const places = $derived.by(() => {
		const byAtomicNumber = new Map<number, number>();
		const ascending = [...metric.rows].sort((a, b) => a.value - b.value);
		for (const [index, row] of ascending.entries()) {
			byAtomicNumber.set(row.atomicNumber, index + 1);
		}
		return byAtomicNumber;
	});

	// A tap has no hover to hold the tooltip open, and layerchart hides on
	// `pointerleave`, which a tap fires straight after `pointerup`. Pinning on a
	// touch keeps it readable; a second tap lets it go. A mouse click is not a pin.
	let pinned = $state(false);

	function pin(event: MouseEvent) {
		const { pointerType } = event as MouseEvent & { pointerType?: string };
		if (pointerType === 'touch' || pointerType === 'pen') pinned = !pinned;
	}

	// The value in the metric's own unit. `format` already carries that unit for
	// five of the six metrics; the sixth names its scale in `unit` alone, so a
	// trailing copy is added rather than a second formatter invented.
	function reading(row: TrendRow): string {
		const text = metric.format(row.value);
		return text.endsWith(metric.unit) ? text : `${text} ${metric.unit}`;
	}
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
		tooltipContext={{ mode: 'bisect-x', locked: pinned, onclick: pin }}
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

		<!--
			Portaled to the body by default and bounded by the viewport, so no
			scrolling box and no chart edge can clip it. `variant="none"` drops the
			library's own colours: this is drawn in the app's tokens like every other
			surface. The motion is the library spring, gated the same way the marks are.
		-->
		<Tooltip.Root
			variant="none"
			classes={{ container: 'trend-tooltip' }}
			contained="window"
			motion={motionOk() ? 'spring' : 'none'}
			fadeDuration={motionOk() ? durations.fast.ms : 0}
		>
			{#snippet children({ data }: { data: TrendRow })}
				<Tooltip.Header color={categoryVar(data.category)}>
					<span class="tip-identity">
						<span class="tip-index">#{data.atomicNumber}</span>
						{data.symbol} · {data.name}
					</span>
				</Tooltip.Header>
				<Tooltip.List>
					<Tooltip.Item label={metric.label} value={reading(data)} valueAlign="right" />
					<Tooltip.Item
						label={humanCategory(data.category)}
						value={`rank ${places.get(data.atomicNumber)} of ${metric.rows.length}`}
						valueAlign="right"
					/>
				</Tooltip.List>
			{/snippet}
		</Tooltip.Root>
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

	/* The point under the pointer grows and comes forward. The chart's SVG sits
	   inside the tooltip's own pointer layer, so these circles do see `:hover` —
	   the library's `Highlight` mark would cost about 8 KB gzipped to do the same
	   thing, and it would fade every other category on its way past.

	   `fill-box` is what makes the scale happen about the centre of each dot
	   rather than about the origin of the canvas. */
	.plot :global(.lc-point) {
		transform-box: fill-box;
		transform-origin: center;
		transition:
			transform var(--dur-fast) var(--ease-out),
			opacity var(--dur-fast) var(--ease-out);
	}

	/* Pointer only: on touch a scaled dot sticks until the next tap. */
	@media (hover: hover) {
		.plot :global(.lc-point:hover) {
			transform: scale(1.8);
			opacity: 1;
		}
	}

	/* Moment 2's reduced alternative: the dot still answers the pointer, it just
	   arrives at its size instead of growing into it. */
	.plot[data-motion='off'] :global(.lc-point) {
		transition: none;
	}

	/* Portaled out of the chart and out of this component's DOM, so the box is
	   named by its class rather than reached by a descendant selector. */
	:global(.trend-tooltip) {
		max-inline-size: min(17rem, calc(100vw - 1rem));
		padding: 0.5rem 0.625rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface-raised);
		color: var(--ink);
		font-size: var(--text-xs);
	}

	/* Two lines, no more: who this is, what it is worth, and one number to compare
	   it with. The identity is data, so it keeps the data face and the tabular
	   figures of the table it came from. */
	.tip-identity {
		display: inline-flex;
		align-items: baseline;
		gap: 0.375rem;
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
	}

	.tip-index {
		color: var(--ink-dim);
	}

	:global(.lc-tooltip-header) {
		gap: 0.4375rem;
		margin-block-end: 0.375rem;
		padding-block-end: 0.375rem;
		border-block-end: 1px solid var(--line);
		font-size: var(--text-xs);
		font-weight: 600;
	}

	:global(.lc-tooltip-header-color),
	:global(.lc-tooltip-item-color) {
		inline-size: 0.5rem;
		block-size: 0.5rem;
	}

	:global(.lc-tooltip-list) {
		gap: 0.125rem 0.75rem;
		align-items: baseline;
	}

	:global(.lc-tooltip-item-label) {
		color: var(--ink-dim);
	}

	:global(.lc-tooltip-item-value) {
		font-family: var(--font-data);
		color: var(--ink);
	}
</style>
