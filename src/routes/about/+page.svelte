<script lang="ts">
	import AppHeader from '#lib/components/shell/AppHeader.svelte';
	// Data provenance. Everything here comes from the generated attribution
	// module, which is written from the same constants as vendor/PINNED.md.
	import { attribution } from '#lib/data/attribution.ts';
	import { shortcuts } from '#lib/data/shortcuts.ts';

	// The version is the build's, not this file's: `vite.config.ts` inlines the
	// one string in `package.json`, so the about page cannot outlive a release.
	const version = __APP_VERSION__;
</script>

<main class="min-h-dvh bg-bg px-4 py-6 text-ink sm:px-6">
	<AppHeader />

	<article class="prose-about">
		<h2>About Lolia</h2>

		<p class="lede">
			A periodic table of the elements for Android, Windows, macOS, Linux and the web.
			One SvelteKit app, built once as static files, shipped in three kinds of shell.
		</p>

		<dl class="facts">
			<dt>Version</dt>
			<dd>v{version}</dd>
		</dl>

		<h3>Element data</h3>

		<p>
			Every number, name and description in the table comes from the
			<a href={attribution.repository}>Periodic-Table-JSON</a> project, which is licensed
			<a href={attribution.licenseUrl}>{attribution.license}</a> and draws on Wikipedia.
			Lolia reads one pinned commit, <code>{attribution.commit}</code>, rather than a
			moving branch, so a release always shows the data it was built with.
		</p>

		<p>
			That licence is share-alike: the element data stays under
			{attribution.license}, and anything built from it has to carry the same licence and
			the same attribution. The app code around the data is not affected.
		</p>

		<h3>Keyboard</h3>

		<dl class="keys">
			{#each shortcuts as shortcut (shortcut.keys)}
				<div class="key-row">
					<dt>{shortcut.keys}</dt>
					<dd>{shortcut.action}</dd>
				</div>
			{/each}
		</dl>
	</article>
</main>

<style>
	.prose-about {
		max-inline-size: 42rem;
		margin-inline: auto;
	}

	h2 {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		font-weight: 700;
		letter-spacing: -0.01em;
		line-height: 1.1;
	}

	h3 {
		margin-block: 1.75rem 0.5rem;
		font-size: var(--text-xs);
		font-weight: 400;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-dim);
	}

	.lede {
		margin-block: 0.5rem 1.5rem;
		font-family: var(--font-prose);
		font-size: var(--text-lg);
		line-height: 1.5;
		color: var(--ink);
	}

	p {
		margin-block: 0.75rem;
		font-size: var(--text-sm);
		line-height: 1.6;
		color: var(--ink-dim);
	}

	a {
		color: var(--ink);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	a:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}

	code {
		font-family: var(--font-data);
		font-size: var(--text-xs);
		overflow-wrap: anywhere;
	}

	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.75rem;
		margin: 0;
		padding-block-end: 0.75rem;
		border-block-end: 1px solid var(--line);
		font-family: var(--font-data);
		font-size: var(--text-xs);
	}

	.facts dt {
		color: var(--ink-dim);
	}

	.facts dd {
		margin: 0;
	}

	.keys {
		margin: 0;
	}

	/* Two columns that collapse to one on a phone, so a long gesture name never
	   squeezes its description into a sliver. */
	.key-row {
		display: grid;
		grid-template-columns: minmax(9rem, auto) 1fr;
		gap: 0.25rem 1rem;
		padding-block: 0.375rem;
		border-block-end: 1px solid var(--line);
		font-size: var(--text-sm);
	}

	.key-row dt {
		font-family: var(--font-data);
		font-size: var(--text-xs);
		color: var(--ink);
	}

	.key-row dd {
		margin: 0;
		color: var(--ink-dim);
	}

	@media (max-width: 30rem) {
		.key-row {
			grid-template-columns: 1fr;
		}
	}
</style>
