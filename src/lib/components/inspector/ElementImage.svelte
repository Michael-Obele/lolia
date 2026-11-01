<script lang="ts">
	import { categoryVar } from '#lib/design/category.ts';
	import type { Element } from '#lib/data/types.ts';
	import { resolvePhoto } from '#lib/platform/photoCache.ts';

	let { element }: { element: Element } = $props();

	// Nothing here is fetched until this component exists, and it only exists once
	// the inspector is open for this element. `null` means "no photo to show":
	// either the answer has not arrived yet, or it never will and the plate stays.
	let src = $state<string | null>(null);

	// A cache hit becomes an object URL, which the page has to hand back or the
	// blob is pinned for the life of the document. Deliberately not `$state`: it
	// is a handle to release, not something to render.
	let objectUrl: string | null = null;

	function release() {
		if (objectUrl) URL.revokeObjectURL(objectUrl);
		objectUrl = null;
	}

	// One lookup per element, after the panel has painted. The inspector never
	// waits for this: the plate is already on screen, and the photo is a second
	// arrival that either replaces it or does not.
	$effect(() => {
		const photo = element.image;
		const symbol = element.symbol;
		let live = true;

		src = null;

		void resolvePhoto(photo, symbol).then((resolved) => {
			if (!live || resolved.source === 'placeholder') return;
			if (resolved.source === 'cache') {
				objectUrl = URL.createObjectURL(resolved.blob);
				src = objectUrl;
				return;
			}
			src = resolved.url;
		});

		return () => {
			live = false;
			release();
		};
	});
</script>

<!-- A caption whenever a photo renders, because the upstream licences differ per
     image and the attribution travels with the bytes. A plate needs neither. -->
<figure class="photo" style:--cat={categoryVar(element.category)}>
	{#if src}
		<img
			class="shot"
			{src}
			alt={element.name}
			width="480"
			height="360"
			loading="lazy"
			decoding="async"
			onerror={() => (src = null)}
		/>
		{#if element.image}
			<figcaption class="credit">
				<span class="credit-title">{element.image.title}</span>
				<span class="credit-line">{element.image.attribution}</span>
			</figcaption>
		{/if}
	{:else}
		<!-- Drawn, never fetched: the symbol over a tint of the element's own
		     category, with the name as its accessible label. This is the success
		     path offline, so it has to read as a plate rather than a failure. -->
		<div class="plate" role="img" aria-label={element.name}>
			<span class="plate-symbol" aria-hidden="true">{element.symbol}</span>
			<span class="plate-name" aria-hidden="true">{element.name}</span>
		</div>
	{/if}
</figure>

<style>
	/* One fixed box for every state, so a photo arriving never moves a pixel of
	   the panel underneath it. */
	.photo {
		position: relative;
		margin: 0;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: color-mix(in oklab, var(--cat) 12%, var(--surface));
	}

	.shot {
		position: absolute;
		inset: 0;
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
	}

	.plate {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		/* The hairline is the category too, so the plate reads as a swatch of the
		   element rather than as a broken slot. */
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--cat) 40%, transparent);
	}

	.plate-symbol {
		font-family: var(--font-display);
		font-size: var(--text-3xl);
		font-weight: 700;
		line-height: 1;
		color: color-mix(in oklab, var(--cat) 50%, var(--ink));
	}

	.plate-name {
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-dim);
	}

	/* Over the photo, in a scrim, clamped: some attribution strings are three
	   lines and the whole string is still in the DOM for a screen reader. */
	.credit {
		position: absolute;
		inset-inline: 0;
		inset-block-end: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: 1.25rem 0.625rem 0.5rem;
		font-size: var(--text-xs);
		line-height: 1.35;
		color: var(--ink-dim);
		background: linear-gradient(
			to top,
			color-mix(in oklab, var(--surface) 94%, transparent),
			color-mix(in oklab, var(--surface) 70%, transparent) 60%,
			transparent
		);
	}

	.credit-title,
	.credit-line {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.credit-title {
		-webkit-line-clamp: 1;
		line-clamp: 1;
		color: var(--ink);
	}

	.credit-line {
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}
</style>
