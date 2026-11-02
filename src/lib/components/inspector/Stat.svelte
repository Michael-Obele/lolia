<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { untrack } from 'svelte';
	import { NOT_KNOWN, notKnownTitle } from '#lib/format/units.ts';
	import { easing } from '#lib/motion/easing.ts';
	import { motionOk } from '#lib/motion/reduced.ts';
	import { durations } from '#lib/motion/tokens.ts';

	// One finished value, its unit, and the em dash every missing value becomes.
	// It is handed strings, so it never learns which element it is describing.
	//
	// A number is the exception. The panel remounts its groups on every selection,
	// so a row cannot remember what it last showed: `from` is that memory, handed
	// in by the panel, and the value travels from it to `number`.
	let {
		label,
		value = null,
		unit = null,
		number = null,
		from = null,
		format = null
	}: {
		label: string;
		value?: string | null;
		unit?: string | null;
		number?: number | null;
		/** The previous selection's value for this row, so the number can move. */
		from?: number | null;
		format?: ((value: number) => string | null) | null;
	} = $props();

	// Read once, at birth — this row is created with its value, so there is no
	// later frame at which the preference could change under it.
	const birth = untrack(() => ({
		from,
		hasFormat: format !== null,
		canAnimate: motionOk()
	}));

	// `raw`, not a deep proxy: a Tween is a handle with its own reactivity, and
	// proxying it would wrap `current` in a second layer.
	let tween = $state.raw<Tween<number> | null>(null);

	// A row can be born before its number. The panel prints the core fields first
	// and the detail lands a moment later, so the tween is built the frame the
	// number arrives rather than the frame the row does — and it still travels
	// from the previous selection's value, which `from` has been carrying. A row
	// that outlives its number follows it instead of sticking.
	$effect(() => {
		const target = number;
		if (!birth.hasFormat || target === null) return;

		if (tween === null) {
			const prior = birth.from;
			const start = prior !== null && birth.canAnimate ? prior : target;
			const created = new Tween(start, {
				duration: durations.slow.ms,
				easing: easing.out
			});
			if (start !== target) created.target = target;
			tween = created;
			return;
		}

		tween.target = target;
	});
</script>

<!-- One row: the label on the start edge, the value on the end edge. -->
<div class="stat">
	<dt>{label}</dt>
	<dd>
		{#if tween}
			<span class="value">{format?.(tween.current) ?? NOT_KNOWN}</span>
			{#if unit}<span class="unit">{unit}</span>{/if}
		{:else if number !== null}
			<span class="value">{format?.(number) ?? NOT_KNOWN}</span>
			{#if unit}<span class="unit">{unit}</span>{/if}
		{:else if value === null}
			<span class="empty" title={notKnownTitle(label)}>{NOT_KNOWN}</span>
		{:else}
			<span class="value">{value}</span>{#if unit}<span class="unit">{unit}</span>{/if}
		{/if}
	</dd>
</div>

<style>
	.stat {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0 0.75rem;
	}

	dt {
		flex: 0 1 auto;
		min-inline-size: 0;
		color: var(--ink-dim);
		font-size: var(--text-sm);
	}

	dd {
		flex: 1 1 auto;
		/* Never narrower than the value itself: at 200 percent zoom the label
		   gives way and the value wraps to its own line instead of clipping. */
		min-inline-size: min-content;
		margin: 0;
		font-family: var(--font-data);
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		text-align: end;
		overflow-wrap: break-word;
	}

	.unit {
		margin-inline-start: 0.25em;
		color: var(--ink-dim);
	}

	/* The dash is quieter than a value, and its title says why it is there. It is
	   still text, so it holds the same 4.5:1 floor as the value it stands in for. */
	.empty {
		color: var(--ink-dim);
	}
</style>
