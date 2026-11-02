<script lang="ts">
	import { onMount } from 'svelte';
	import AppHeader from '#lib/components/shell/AppHeader.svelte';
	import Legend from '#lib/components/table/Legend.svelte';
	import { elementCount, metrics, type MetricId } from '#lib/data/metrics.ts';
	import { categorySlugs } from '#lib/design/category.ts';

	// The chart is a chunk of its own, and this page is the only thing that asks
	// for it. The heading, the switcher and the omission count paint first; the
	// scales and axes land a frame or two later and replace one honest sentence.
	// No shimmer: a page that is 85 KB away from done does not need a fake bar
	// pretending it is halfway.
	type ChartBody = typeof import('#lib/components/charts/TrendChart.svelte')['default'];

	let selected = $state<MetricId>('mass');
	let ChartBody = $state<ChartBody | null>(null);

	const metric = $derived(metrics.find((option) => option.id === selected) ?? metrics[0]);

	// One string rather than a run of conditional markup: an `{#if}` opened mid
	// sentence drops the space before it, and the count is worth reading without a
	// missing space in the middle.
	const summary = $derived.by(() => {
		if (metric.omitted === 0) {
			return `All ${elementCount} elements have a value, plotted against atomic number.`;
		}
		const plotted = `${metric.rows.length} of ${elementCount} elements have a value, plotted against atomic number.`;
		const omitted = `The other ${metric.omitted} are left out of the plot rather than drawn at zero.`;
		const otherUnit =
			metric.otherUnit > 0
				? ` ${metric.otherUnit} of those record a unit this chart does not plot.`
				: '';
		return `${plotted} ${omitted}${otherUnit}`;
	});

	onMount(() => {
		void import('#lib/components/charts/TrendChart.svelte').then((module) => {
			ChartBody = module.default;
		});
	});
</script>

<main class="min-h-dvh bg-bg px-4 py-6 text-ink sm:px-6">
	<AppHeader />

	<section class="mx-auto max-w-272" aria-labelledby="trends-heading">
		<h2 id="trends-heading" class="trends-heading">
			{metric.label}
			<span class="unit">({metric.unit})</span>
		</h2>

		<!-- The count comes before the plot, and says what was left out and why.
		     A missing measurement is a gap in knowledge, not a zero. -->
		<p class="lede">{summary}</p>

		<!-- 2.75rem is the 44px target the header uses, and the reason the labels are
		     short: six full metric names wrap to four rows on a 390px phone. -->
		<div class="switcher" role="group" aria-label="Metric">
			{#each metrics as option (option.id)}
				<button
					type="button"
					class="option"
					aria-pressed={option.id === selected}
					onclick={() => (selected = option.id)}
				>
					{option.short}
				</button>
			{/each}
		</div>

		<!-- One image to a screen reader. A chart of a hundred points is not a
		     hundred tab stops: the summary is the accessible reading, and every
		     element in it opens from the list or the palette. -->
		<div
			class="frame"
			role="img"
			aria-label="{metric.label} in {metric.unit} against atomic number for {metric
				.rows.length} elements, one line per category"
		>
			{#if ChartBody}
				<ChartBody {metric} />
			{:else}
				<p class="status">Loading the chart.</p>
			{/if}
		</div>

		<Legend categories={categorySlugs} />

		<p class="note">
			The points are not links. layerchart's <code>Points</code> mark draws circles
			with no per-point href, and wrapping a hundred of them in tab stops would cost
			more than it gives — so the chart stays one inert image and every element in it
			is one keystroke away in the palette.
		</p>
	</section>
</main>

<style>
	.trends-heading {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 600;
		line-height: 1.2;
	}

	.unit {
		color: var(--ink-dim);
		font-family: var(--font-data);
		font-size: var(--text-sm);
		font-weight: 400;
	}

	.lede {
		margin-block: 0.375rem 1rem;
		max-inline-size: 48ch;
		font-size: var(--text-sm);
		line-height: 1.5;
		color: var(--ink-dim);
	}

	.switcher {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-block-end: 0.75rem;
	}

	.option {
		display: inline-flex;
		align-items: center;
		min-block-size: 2.75rem;
		padding-inline: 0.75rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: none;
		font-size: var(--text-sm);
		color: var(--ink-dim);
		cursor: pointer;
	}

	/* The current metric is stated twice — bolder ink and a real border — so it is
	   never colour alone that says which one is showing. */
	.option[aria-pressed='true'] {
		border-color: var(--ink);
		color: var(--ink);
		font-weight: 600;
	}

	.option:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}

	.frame {
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 0.5rem;
	}

	/* Honest, and deliberately not a skeleton: there is nothing to sketch yet. */
	.status {
		display: flex;
		align-items: center;
		justify-content: center;
		block-size: 18rem;
		font-size: var(--text-sm);
		color: var(--ink-faint);
	}

	@media (min-width: 640px) {
		.status {
			block-size: 22rem;
		}
	}

	.note {
		margin-block-start: 1.25rem;
		max-inline-size: 68ch;
		font-size: var(--text-xs);
		line-height: 1.6;
		color: var(--ink-faint);
	}

	code {
		font-family: var(--font-data);
	}
</style>
