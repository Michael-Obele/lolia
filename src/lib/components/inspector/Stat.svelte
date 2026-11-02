<script lang="ts">
	import { NOT_KNOWN, notKnownTitle } from '#lib/format/units.ts';

	// One finished value, its unit, and the em dash every missing value becomes.
	// It is handed strings, so it never learns which element it is describing.
	let {
		label,
		value,
		unit = null
	}: { label: string; value: string | null; unit?: string | null } = $props();
</script>

<!-- One row: the label on the start edge, the value on the end edge. -->
<div class="stat">
	<dt>{label}</dt>
	<dd>
		{#if value === null}
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
