<script lang="ts">
	import { getTheme, toggleTheme } from '#lib/theme.svelte.ts';

	const dark = $derived(getTheme() === 'dark');
</script>

<div class="row">
	<span class="label" id="theme-label">Theme</span>
	<button
		type="button"
		role="switch"
		aria-checked={dark}
		aria-labelledby="theme-label"
		class="switch"
		onclick={toggleTheme}
	>
		<span class="track" aria-hidden="true"><span class="thumb"></span></span>
		<span class="value">{dark ? 'Dark' : 'Light'}</span>
	</button>
</div>

<style>
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.label {
		font-size: var(--text-sm);
		color: var(--ink-dim);
	}

	.switch {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-block-size: 2.75rem;
		padding: 0;
		background: none;
		border: 0;
		color: var(--ink);
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.track {
		display: inline-grid;
		align-items: center;
		inline-size: 2.75rem;
		block-size: 1.5rem;
		padding-inline: 0.25rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface);
		transition: background-color var(--dur-fast) var(--ease-out);
	}

	.thumb {
		inline-size: 1rem;
		block-size: 1rem;
		border-radius: 999px;
		background: var(--ink-faint);
		transition:
			translate var(--dur-fast) var(--ease-out),
			background-color var(--dur-fast) var(--ease-out);
	}

	.switch[aria-checked='true'] .track {
		background: var(--ink);
	}

	.switch[aria-checked='true'] .thumb {
		translate: 1.1rem 0;
		background: var(--bg);
	}

	.switch:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}

	.value {
		min-inline-size: 3rem;
		text-align: start;
	}

	@media (prefers-reduced-motion: reduce) {
		.track,
		.thumb {
			transition: none;
		}
	}
</style>
