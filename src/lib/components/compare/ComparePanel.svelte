<script lang="ts">
	// The compare view: rows are properties, columns are elements. The tray decides
	// which elements, this decides what is worth reading about them side by side.
	import ScrollArea from '#lib/components/ui/scroll-area/scroll-area.svelte';
	import { humanCategory } from '#lib/components/table/model.ts';
	import { elements } from '#lib/data/elements.generated.ts';
	import type { Element } from '#lib/data/types.ts';
	import { categoryVar } from '#lib/design/category.ts';
	import {
		NOT_KNOWN,
		decimal,
		densityUnit,
		formatKelvin,
		formatMass,
		formatPlain,
		notKnownTitle
	} from '#lib/format/units.ts';
	import { tray } from './tray.svelte.ts';

	type Row = {
		label: string;
		/** The finished text, already through `format/units.ts`. */
		value: (element: Element) => string | null;
		/** A unit printed beside the value, and the unit two values must share. */
		unit?: (element: Element) => string | null;
		/** The number an extreme is picked from. Absent means the row is not ranked. */
		measure?: (element: Element) => number | null;
		direction?: 'high' | 'low';
		/** What winning means, in words, under the row label. */
		caption?: string;
	};

	const bySymbol = new Map(elements.map((element) => [element.symbol, element]));

	const columns = $derived(
		tray.visible.flatMap((symbol) => {
			const element = bySymbol.get(symbol);
			return element ? [element] : [];
		})
	);

	// Direction per row is chosen for what a reader wants to know, not for a
	// house rule: the heaviest element is the interesting one, and so is the one
	// that gives up an electron most easily.
	const rows: Row[] = [
		{ label: 'atomic number', value: (element) => formatPlain(element.number) },
		{
			label: 'atomic mass',
			value: (element) => formatMass(element.mass),
			measure: (element) => element.mass,
			direction: 'high',
			caption: 'heaviest'
		},
		{ label: 'category', value: (element) => humanCategory(element.category) },
		{ label: 'block', value: (element) => element.block },
		{ label: 'group', value: (element) => formatPlain(element.group) },
		{ label: 'period', value: (element) => formatPlain(element.period) },
		{
			label: 'phase',
			value: (element) => (element.phase === 'unknown' ? null : element.phase)
		},
		{
			label: 'melting point',
			value: (element) => formatKelvin(element.meltingPoint),
			measure: (element) => element.meltingPoint,
			direction: 'high',
			caption: 'highest'
		},
		{
			label: 'boiling point',
			value: (element) => formatKelvin(element.boilingPoint),
			measure: (element) => element.boilingPoint,
			direction: 'high',
			caption: 'highest'
		},
		{
			label: 'density',
			value: (element) => formatPlain(element.density?.value ?? null),
			unit: (element) => densityUnit(element.density?.unit ?? null),
			measure: (element) => element.density?.value ?? null,
			direction: 'high',
			caption: 'densest, same unit'
		},
		{
			label: 'electronegativity',
			value: (element) => formatPlain(element.electronegativity),
			measure: (element) => element.electronegativity,
			direction: 'high',
			caption: 'most electronegative'
		},
		{
			label: 'first ionization energy',
			value: (element) => {
				const first = element.ionizationEnergies[0];
				return first === undefined ? null : decimal(first, 3);
			},
			measure: (element) => element.ionizationEnergies[0] ?? null,
			direction: 'low',
			caption: 'easiest to ionise'
		},
		{
			label: 'electron affinity',
			value: (element) => formatPlain(element.electronAffinity),
			measure: (element) => element.electronAffinity,
			direction: 'high',
			caption: 'highest'
		},
		{
			label: 'valence electrons',
			value: (element) => formatPlain(element.shells.at(-1) ?? null),
			measure: (element) => element.shells.at(-1) ?? null,
			direction: 'high',
			caption: 'most'
		},
		{
			label: 'electron configuration',
			value: (element) =>
				element.electronConfigurationSemantic ?? element.electronConfiguration
		}
	];

	/**
	 * The symbols at the extreme of a row, and why there is none when the reason is
	 * worth saying out loud. Three ways an extreme would be a lie: fewer than two
	 * values, every value the same, or values carrying different units — 1 g/cm3 and
	 * 0.09 g/L are not a comparison.
	 */
	function extremes(row: Row, list: Element[]): { best: Set<string>; note: string | null } {
		const none: { best: Set<string>; note: string | null } = { best: new Set(), note: null };
		const { measure, direction } = row;
		if (!measure || !direction) return none;

		const measured = list.flatMap((element) => {
			const n = measure(element);
			return n === null || !Number.isFinite(n) ? [] : [{ element, n }];
		});
		if (measured.length < 2) return none;
		if (measured.every(({ n }) => n === measured[0].n)) return none;

		const units = new Set(measured.map(({ element }) => row.unit?.(element) ?? ''));
		if (units.size > 1) return { best: new Set(), note: 'mixed units, not compared' };

		const best = measured.reduce((a, b) =>
			direction === 'high' ? (b.n > a.n ? b : a) : b.n < a.n ? b : a
		);
		// A tie is a tie: both columns are the extreme, and neither is the winner.
		return {
			best: new Set(measured.filter(({ n }) => n === best.n).map(({ element }) => element.symbol)),
			note: null
		};
	}
</script>

{#if columns.length === 0}
	<div class="empty">
		<p class="empty-line">Nothing to compare yet.</p>
		<p class="empty-hint">
			Add up to {tray.cap} elements from the inspector — the Compare button on any element
			panel.
		</p>
		<a class="empty-link" href="/">Open the table</a>
	</div>
{:else}
	<!-- Both axes on one scroll surface: one viewport means the first column and
	     the header row can stick to it, which a nested scroller would break. -->
	<ScrollArea orientation="both" class="min-h-0 flex-1" viewportClass="compare-viewport">
		<table class="compare" aria-label="Comparison of {columns.length} elements">
			<thead>
				<tr>
					<th scope="col" class="corner">property</th>
					{#each columns as element (element.symbol)}
						<th scope="col" class="element" style:--hue={categoryVar(element.category)}>
							<div class="head-row">
								<a class="symbol" href="/element/{element.symbol}">{element.symbol}</a>
								<button
									type="button"
									class="drop"
									aria-label="Remove {element.name} from the comparison"
									onclick={() => tray.remove(element.symbol)}
								>
									<span aria-hidden="true">×</span>
								</button>
							</div>
							<span class="name">{element.name}</span>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.label)}
					{@const marked = extremes(row, columns)}
					<tr>
						<th scope="row" class="property">
							<span class="label">{row.label}</span>
							{#if row.caption && marked.best.size > 0}
								<span class="caption">{row.caption}</span>
							{:else if marked.note}
								<span class="caption">{marked.note}</span>
							{/if}
						</th>
						{#each columns as element (element.symbol)}
							{@const value = row.value(element)}
							{@const unit = row.unit?.(element) ?? null}
							<td class:extreme={marked.best.has(element.symbol)}>
								{#if value === null}
									<span class="absent" title={notKnownTitle(row.label)}>{NOT_KNOWN}</span>
								{:else}
									{value}{#if unit}<span class="unit">{unit}</span>{/if}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</ScrollArea>

	{#if tray.hidden > 0}
		<p class="note" role="status">
			{tray.hidden} more {tray.hidden === 1 ? 'element is' : 'elements are'} in the tray and not
			shown here — this screen compares {tray.cap} at a time.
		</p>
	{/if}
{/if}

<style>
	.compare {
		border-collapse: separate;
		border-spacing: 0;
		font-family: var(--font-data);
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}

	/* The property column is the one thing that must survive a sideways scroll. */
	.corner,
	.property {
		position: sticky;
		inset-inline-start: 0;
		z-index: 1;
		background: var(--bg);
		text-align: start;
		font-weight: 400;
		color: var(--ink-dim);
	}

	.corner {
		inset-block-start: 0;
		z-index: 3;
		font-size: var(--text-xs);
	}

	.property {
		min-inline-size: 8.5rem;
		max-inline-size: 12rem;
		padding: 0.5rem 0.75rem 0.5rem 0;
		border-block-end: 1px solid var(--line);
		vertical-align: top;
	}

	.label {
		display: block;
	}

	/* What the emphasis below means. Nothing is marked without it. */
	.caption {
		display: block;
		font-size: var(--text-xs);
		color: var(--ink-faint);
	}

	/* A sticky header row, and the category hue as a border rather than a fill:
	   the hue is data, and a fill would read as a state. */
	.element {
		position: sticky;
		inset-block-start: 0;
		z-index: 2;
		min-inline-size: 10rem;
		padding: 0.5rem 0.75rem;
		border-block-start: 2px solid var(--hue);
		border-block-end: 1px solid var(--line);
		background: var(--bg);
		text-align: start;
		vertical-align: bottom;
	}

	.symbol {
		display: block;
		font-size: var(--text-lg);
		font-weight: 600;
		line-height: 1.1;
		color: var(--ink);
		text-decoration: none;
	}

	.symbol:hover {
		text-decoration: underline;
	}

	.symbol:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}

	.name {
		display: block;
		font-family: var(--font-display);
		font-size: var(--text-xs);
		color: var(--ink-dim);
	}

	/* 2.75rem of touch target beside the symbol, and its label says what it removes. */
	.head-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.25rem;
	}

	.drop {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		min-block-size: 2.75rem;
		min-inline-size: 2.75rem;
		border: 0;
		background: none;
		color: var(--ink-dim);
		font-size: var(--text-base);
	}

	.drop:hover {
		color: var(--ink);
	}

	.drop:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: -2px;
	}

	td {
		padding: 0.5rem 0.75rem;
		border-block-end: 1px solid var(--line);
		color: var(--ink);
		vertical-align: top;
		overflow-wrap: anywhere;
	}

	/* Subtle on purpose: a tinted cell and bolder ink, no badge and no colour
	   outside the tokens. The caption on the row is what makes it mean something. */
	td.extreme {
		background: var(--surface);
		font-weight: 600;
	}

	.absent {
		color: var(--ink-dim);
	}

	.unit {
		margin-inline-start: 0.25em;
		color: var(--ink-dim);
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
		padding-block: 2rem;
	}

	.empty-line {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 600;
	}

	.empty-hint {
		max-inline-size: 34rem;
		font-size: var(--text-sm);
		color: var(--ink-dim);
	}

	.empty-link {
		display: inline-flex;
		align-items: center;
		min-block-size: 2.75rem;
		padding-inline: 0.75rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		font-size: var(--text-sm);
		color: var(--ink);
		text-decoration: none;
	}

	.empty-link:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}

	.note {
		margin-block-start: 0.5rem;
		font-size: var(--text-xs);
		color: var(--ink-dim);
	}

	/* A phone reads one column at a time beside the labels, so a column has to fit
	   in what the sticky first column leaves. */
	@media (max-width: 719px) {
		.element,
		td {
			min-inline-size: 9rem;
		}

		.property {
			min-inline-size: 7.5rem;
		}
	}
</style>
