<script lang="ts">
	// Data provenance. Everything here comes from the generated attribution
	// module, which is written from the same constants as vendor/PINNED.md.
	// Unstyled on purpose: M3 owns typography.
	import { attribution } from '#lib/data/attribution.ts';
</script>

<main>
	<h1>About Lolia</h1>

	<p>Element data comes from the Periodic-Table-JSON project.</p>

	<dl>
		<dt>Repository</dt>
		<dd>
			<a href={attribution.repository}>{attribution.repository}</a>
		</dd>

		<dt>Licence</dt>
		<dd>
			<a href={attribution.licenseUrl}>{attribution.license}</a>
		</dd>

		<dt>Pinned commit</dt>
		<dd>
			<code>{attribution.commit}</code>
		</dd>
	</dl>

	<p><a href="/">Back to the table</a></p>
</main>
