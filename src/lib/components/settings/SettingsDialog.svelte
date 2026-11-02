<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { elements } from '#lib/data/elements.generated.ts';
	import { shortcuts } from '#lib/data/shortcuts.ts';
	import { formatBytes } from '#lib/format/units.ts';
	import {
		cachedStats,
		clear as clearPhotos,
		downloadAll,
		type PhotoJob,
		type PhotoProgress
	} from '#lib/platform/photoCache.ts';
	import ThemeToggle from './ThemeToggle.svelte';

	let open = $state(false);
	let cleared = $state(false);
	let content: HTMLElement | null = $state(null);

	// Opening has to move focus into the dialog. The trigger stays behind the
	// overlay, so a modal that leaves focus there reads as a page that did nothing
	// — measured: the trigger kept focus until this effect existed. The content is
	// the dialog itself (`tabindex="-1"`), so the title and description are read
	// before its first control.
	$effect(() => {
		if (open) content?.focus();
	});

	// The motion task reads `lolia.ignited`; this row only owns the storage.
	function resetIntroduction() {
		try {
			localStorage.removeItem('lolia.ignited');
			cleared = true;
		} catch {
			cleared = false;
		}
	}

	// Built from the generated array, so the count is the data's and never a literal
	// that drifts when the upstream table changes.
	const photos: PhotoJob[] = elements.flatMap((element) =>
		element.image ? [{ symbol: element.symbol, url: element.image.url }] : []
	);

	// Declared here rather than inside the dialog body, because bits-ui unmounts
	// that on close and a download should outlive a closed dialog.
	let progress = $state<PhotoProgress | null>(null);
	let busy = $state(false);
	let confirming = $state(false);
	let controller: AbortController | null = null;

	// Read from the store's own change events, so a download or a clear updates
	// these two numbers with no refresh call anywhere.
	const cached = $derived(cachedStats());

	async function download() {
		if (busy) return;
		busy = true;
		confirming = false;
		controller = new AbortController();
		await downloadAll(
			photos,
			(next) => (progress = next),
			controller.signal
		);
		controller = null;
		busy = false;
	}

	function cancel() {
		controller?.abort();
	}

	async function forget() {
		confirming = false;
		progress = null;
		await clearPhotos();
	}
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
			bind:ref={content}
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
				<p class="note">
					Optional. Every element without a photo shows a drawn plate, so the app works
					without any of them.
				</p>

				{#if progress}
					<p class="note status" role="status">
						{progress.done} / {progress.total}
						{#if progress.failed}
							· {progress.failed} could not be downloaded and are not available offline
						{/if}
					</p>
					<progress
						class="bar"
						value={progress.done}
						max={progress.total}
						aria-label="Photo download progress"
					></progress>
				{/if}

				<p class="note">
					{cached.count} of {photos.length} cached · {formatBytes(cached.bytes)}
				</p>

				<div class="row">
					{#if busy}
						<button type="button" class="action" onclick={cancel}>Cancel</button>
					{:else}
						<button type="button" class="action" onclick={download}>
							Download all element photos
						</button>
						{#if cached.count > 0}
							<button type="button" class="action" onclick={() => (confirming = true)}>
								Clear
							</button>
						{/if}
					{/if}
				</div>

				{#if confirming}
					<div class="row">
						<p class="note">Delete {cached.count} cached photos?</p>
						<button type="button" class="action" onclick={forget}>Delete</button>
						<button type="button" class="action" onclick={() => (confirming = false)}>
							Keep
						</button>
					</div>
				{/if}
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
		color: var(--ink-dim);
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

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-block-start: 0.5rem;
	}

	/* A native progress element, un-native-looking: `accent-color` is ignored by
	   some engines and leaves the platform green in a warm palette. */
	.bar {
		appearance: none;
		inline-size: 100%;
		block-size: 0.375rem;
		margin-block-start: 0.375rem;
		border: 0;
		border-radius: var(--radius);
		background: var(--line);
		overflow: hidden;
	}

	.bar::-webkit-progress-bar {
		background: var(--line);
	}

	.bar::-webkit-progress-value {
		background: var(--ink-dim);
		border-radius: var(--radius);
	}

	.bar::-moz-progress-bar {
		background: var(--ink-dim);
		border-radius: var(--radius);
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
