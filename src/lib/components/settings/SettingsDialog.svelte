<script lang="ts">
	import { Dialog } from 'bits-ui';
	import ThemeToggle from './ThemeToggle.svelte';

	let open = $state(false);
	let cleared = $state(false);

	// The motion task reads `lolia.ignited`; this row only owns the storage.
	function resetIntroduction() {
		try {
			localStorage.removeItem('lolia.ignited');
			cleared = true;
		} catch {
			cleared = false;
		}
	}

	const shortcuts = [
		{ keys: 'Arrow keys', action: 'Move between cells' },
		{ keys: 'Home, End', action: 'Jump to the ends of a row' },
		{ keys: 'Page Up, Page Down', action: 'Move by period' },
		{ keys: 'Escape', action: 'Close the panel' }
	];
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger
		class="min-h-11 rounded-lg border border-line px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
	>
		Settings
	</Dialog.Trigger>

	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-40 bg-bg opacity-70" />

		<Dialog.Content
			class="fixed inset-x-3 top-1/2 z-50 flex max-h-[calc(100dvh-3rem)] -translate-y-1/2 flex-col gap-4 overflow-y-auto overscroll-contain rounded-lg border border-line bg-surface-raised p-4 text-ink sm:inset-x-0 sm:mx-auto sm:w-[min(26rem,calc(100vw-2rem))]"
		>
			<div class="head">
				<Dialog.Title class="font-display text-xl font-semibold leading-tight">
					Settings
				</Dialog.Title>
				<Dialog.Close
					class="min-h-11 min-w-11 shrink-0 rounded-lg border border-line text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
					aria-label="Close settings"
				>
					Close
				</Dialog.Close>
			</div>

			<Dialog.Description class="text-sm text-ink-dim">
				Appearance, the introduction, and the keyboard.
			</Dialog.Description>

			<ThemeToggle />

			<section class="group">
				<h3 class="legend">introduction</h3>
				<button type="button" class="action" onclick={resetIntroduction}>
					Reset the introduction
				</button>
				{#if cleared}
					<p class="note status" role="status">
						Cleared. The introduction plays again on the next load.
					</p>
				{/if}
			</section>

			<section class="group">
				<h3 class="legend">element photos</h3>
				<p class="note">Not available yet.</p>
			</section>

			<section class="group">
				<h3 class="legend">keyboard</h3>
				<dl class="keys">
					{#each shortcuts as shortcut (shortcut.keys)}
						<div class="key-row">
							<dt>{shortcut.keys}</dt>
							<dd>{shortcut.action}</dd>
						</div>
					{/each}
				</dl>
			</section>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.group + .group {
		padding-block-start: 1rem;
		border-block-start: 1px solid var(--line);
	}

	.legend {
		margin-block-end: 0.375rem;
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-faint);
	}

	.action {
		min-block-size: 2.75rem;
		padding-inline: 0.75rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: none;
		color: var(--ink);
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.action:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}

	.note {
		font-size: var(--text-sm);
		color: var(--ink-dim);
	}

	.status {
		margin-block-start: 0.5rem;
	}

	.keys {
		display: grid;
		gap: 0.375rem;
	}

	.key-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0 0.75rem;
	}

	.key-row dt {
		font-family: var(--font-data);
		font-size: var(--text-sm);
	}

	.key-row dd {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--ink-dim);
		text-align: end;
	}
</style>
