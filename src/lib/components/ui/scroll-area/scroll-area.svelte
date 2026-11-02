<script lang="ts">
	// Vendored by hand from shadcn-svelte's scroll area (D21 — the CLI is never
	// run), over the `bits-ui` primitive, restyled to the D20 tokens. One
	// component, one scrollbar look, in a browser and in every WebView (D22).
	import { ScrollArea } from 'bits-ui';
	import type { Snippet } from 'svelte';

	let {
		orientation = 'vertical',
		type = 'auto',
		class: className = '',
		viewportClass = '',
		children
	}: {
		orientation?: 'vertical' | 'horizontal' | 'both';
		/** `auto` shows the bar whenever the content overflows, which is the only
		 *  honest choice on touch, where there is no hover to reveal it. */
		type?: 'hover' | 'scroll' | 'auto' | 'always';
		class?: string;
		viewportClass?: string;
		children: Snippet;
	} = $props();
</script>

<!-- One bar, named once: the two orientations differ only in the prop they hand
     the primitive, and every style is shared. -->
{#snippet bar(axis: 'vertical' | 'horizontal')}
	<ScrollArea.Scrollbar orientation={axis}>
		{#snippet child({ props })}
			<div {...props} class="bar">
				<ScrollArea.Thumb>
					{#snippet child({ props: thumb })}
						<div {...thumb} class="thumb"></div>
					{/snippet}
				</ScrollArea.Thumb>
			</div>
		{/snippet}
	</ScrollArea.Scrollbar>
{/snippet}

<ScrollArea.Root {type}>
	<!-- Our own elements, not classes handed to the primitive: Svelte's scoping
	     cannot reach a node another component renders, so every node that carries
	     this component's styles is one of these snippets. -->
	{#snippet child({ props })}
		<div {...props} class="scroll-area {className}">
			<ScrollArea.Viewport class={viewportClass}>
				{@render children()}
			</ScrollArea.Viewport>

			{#if orientation === 'vertical' || orientation === 'both'}
				{@render bar('vertical')}
			{/if}

			{#if orientation === 'horizontal' || orientation === 'both'}
				{@render bar('horizontal')}
			{/if}

			{#if orientation === 'both'}
				<ScrollArea.Corner>
					{#snippet child({ props })}
						<div {...props} class="corner"></div>
					{/snippet}
				</ScrollArea.Corner>
			{/if}
		</div>
	{/snippet}
</ScrollArea.Root>

<style>
	/* The root owns the box; the viewport inside it is the scrolling element. A
	   flex column is what lets the viewport shrink into a bounded root instead of
	   overflowing it, which is the one thing bits-ui asks of a caller. */
	.scroll-area {
		position: relative;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* bits-ui renders the viewport itself, so a scoped selector cannot reach it.
	   `contain` is the whole reason the sheet body scrolls instead of moving the
	   sheet: a gesture that reaches the end of the content stops there. */
	:global([data-scroll-area-viewport]) {
		flex: 1 1 auto;
		min-block-size: 0;
		overscroll-behavior: contain;
	}

	.bar {
		display: flex;
		touch-action: none;
		user-select: none;
		padding: 1px;
		background: transparent;
	}

	.bar[data-orientation='vertical'] {
		inline-size: 0.5rem;
	}

	.bar[data-orientation='horizontal'] {
		flex-direction: column;
		block-size: 0.5rem;
	}

	/* --ink-faint is the graphic tone: a thumb is a graphic, never text. */
	.thumb {
		border-radius: 999px;
		background: var(--ink-faint);
		/* The primitive sizes a thumb along its scroll axis with an inline custom
		   property and leaves the other axis to CSS. The bar is a flex container
		   whose main axis is exactly the one the thumb's length is not given on,
		   and the inline `var()` for that axis resolves to nothing, so the
		   declaration is dropped at computed-value time and no rule of ours can
		   restore a length there. Growing along the main axis is the one lever
		   left, and it covers both orientations: each explicit length sits on the
		   cross axis. */
		flex: 1 1 auto;
	}

	.bar:hover .thumb,
	.bar:active .thumb {
		background: var(--ink-dim);
	}

	.corner {
		background: var(--surface);
	}
</style>
