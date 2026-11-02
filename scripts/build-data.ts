// Turns the vendored upstream JSON into the two modules the app imports.
//
// Run with `bun run data:build` (and `prebuild` runs it before every build, so a
// stale generated file cannot ship). Deliberately dumb: validate, normalise,
// print. If upstream changes shape the build stops here, not in a cell at runtime.
//
// It also writes `vendor/PINNED.md` from the same constants it writes into
// `attribution.ts`, so the provenance record and the credits cannot disagree.

import * as v from 'valibot';
import { describeIssue, elementSchema, envelopeSchema, type UpstreamElement } from './schema.ts';
import type {
	Element,
	ElementBlock,
	ElementCategory,
	ElementCore,
	ElementDetail,
	ElementPhase
} from '../src/lib/data/types.ts';

/** Which upstream snapshot this data is, recorded in `vendor/PINNED.md` and in the app. */
const SOURCE = {
	repository: 'https://github.com/Bowserinator/Periodic-Table-JSON',
	commit: 'a78c7a48fe7235cebd6153161a9e7fa70f0cfb30',
	pinnedDate: '2026-11-01',
	// Inherited from Wikipedia, which is where upstream's article text comes from.
	license: 'CC BY-SA 3.0',
	licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
} as const;

const sourceUrl = `https://raw.githubusercontent.com/Bowserinator/Periodic-Table-JSON/${SOURCE.commit}/PeriodicTableJSON.json`;

/**
 * Upstream ships 119 entries: the 118 named elements plus `Ununennium` (`Uue`,
 * number 119), a predicted period-8 placeholder that has no name a table can
 * show. The product is the 118 named elements, so it is dropped here — by atomic
 * number, not by array position, so an upstream reordering cannot shift the cut.
 */
const PREDICTED_PLACEHOLDER_NUMBER = 119;

const ROOT = `${import.meta.dir}/..`;
const VENDOR_JSON = `${ROOT}/vendor/PeriodicTableJSON.json`;
const PINNED_MD = `${ROOT}/vendor/PINNED.md`;
const OUT_DIR = `${ROOT}/src/lib/data`;

/**
 * Upstream's fifteen category strings, mapped onto the ten colour channels.
 * `unknown, ...` families are handled separately: upstream keeps inventing new
 * qualifiers for predicted elements and none of them deserves its own colour.
 */
const CATEGORY_SLUGS: Record<string, ElementCategory> = {
	'diatomic nonmetal': 'reactive-nonmetal',
	'polyatomic nonmetal': 'reactive-nonmetal',
	'noble gas': 'noble-gas',
	'alkali metal': 'alkali-metal',
	'alkaline earth metal': 'alkaline-earth-metal',
	metalloid: 'metalloid',
	'post-transition metal': 'post-transition-metal',
	'transition metal': 'transition-metal',
	lanthanide: 'lanthanide',
	actinide: 'actinide'
};

function fail(message: string): never {
	console.error(`data:build failed: ${message}`);
	process.exit(1);
}

function validate(raw: unknown): UpstreamElement[] {
	const envelope = v.safeParse(envelopeSchema, raw);
	if (!envelope.success) {
		fail(`vendor/PeriodicTableJSON.json is not { "elements": [...] }\n  ${describeIssue(envelope.issues[0])}`);
	}

	const elements: UpstreamElement[] = [];
	const problems: string[] = [];

	for (const [index, entry] of envelope.output.elements.entries()) {
		const result = v.safeParse(elementSchema, entry);
		if (result.success) {
			elements.push(result.output);
			continue;
		}

		const candidate = entry as { symbol?: unknown } | null;
		// 1-based position upstream, which equals the atomic number in this snapshot
		// and is what identifies the entry when the corrupt field *is* `number`.
		const symbol = typeof candidate?.symbol === 'string' ? candidate.symbol : '?';

		// Report every issue rather than only the first, so one run fixes them all.
		for (const issue of result.issues) {
			problems.push(`elements[${index + 1}] (${symbol}): ${describeIssue(issue)}`);
		}
	}

	if (problems.length > 0) {
		fail(`the vendored JSON no longer matches the schema\n  ${problems.join('\n  ')}`);
	}

	return elements;
}

function toCategory(raw: string, symbol: string): ElementCategory {
	const slug = CATEGORY_SLUGS[raw];
	if (slug) return slug;
	if (raw.startsWith('unknown')) return 'unknown';
	// Loud on purpose: a new category is a design decision, not something to swallow.
	fail(`${symbol} has upstream category "${raw}", which CATEGORY_SLUGS in scripts/build-data.ts does not map`);
}

function toBlock(raw: string | null, symbol: string): ElementBlock | null {
	if (raw === null) return null;
	const block = raw.trim().toLowerCase();
	if (block === 's' || block === 'p' || block === 'd' || block === 'f') return block;
	fail(`${symbol} has upstream block "${raw}", expected one of s, p, d, f`);
}

function toPhase(raw: string | null): ElementPhase {
	const phase = raw?.trim().toLowerCase();
	return phase === 'solid' || phase === 'liquid' || phase === 'gas' ? phase : 'unknown';
}

function toSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}

function firstMeasurement(values: number[] | null | undefined): number | null {
	return values?.[0] ?? null;
}

function normalize(upstream: UpstreamElement): Element {
	const radii = upstream.atomic_radii;

	return {
		number: upstream.number,
		symbol: upstream.symbol,
		name: upstream.name,
		slug: toSlug(upstream.name),
		category: toCategory(upstream.category, upstream.symbol),
		block: toBlock(upstream.block, upstream.symbol),
		// Upstream uses 0 for "no group"; this snapshot has no zeroes, so no conversion.
		group: upstream.group,
		period: upstream.period,
		position: { x: upstream.xpos, y: upstream.ypos },
		mass: upstream.atomic_mass,
		phase: toPhase(upstream.phase),
		meltingPoint: upstream.melt,
		boilingPoint: upstream.boil,
		// The value is data; the unit is whatever upstream says, even when it says nothing.
		density: upstream.density === null ? null : { value: upstream.density, unit: upstream.density_unit ?? null },
		electronegativity: upstream.electronegativity_pauling,
		electronAffinity: upstream.electron_affinity,
		ionizationEnergies: upstream.ionization_energies,
		shells: upstream.shells,
		electronConfiguration: upstream.electron_configuration,
		electronConfigurationSemantic: upstream.electron_configuration_semantic,
		radii: {
			empirical: firstMeasurement(radii.empirical),
			calculated: firstMeasurement(radii.calculated),
			vanDerWaals: firstMeasurement(radii.van_der_waals),
			covalentSingle: firstMeasurement(radii.covalent_single),
			covalentTriple: firstMeasurement(radii.covalent_triple),
			metallic: firstMeasurement(radii.metallic)
		},
		discoveredBy: upstream.discovered_by,
		namedBy: upstream.named_by,
		summary: upstream.summary,
		image: upstream.image,
		source: upstream.source,
		spectralImage: upstream.spectral_img
	};
}

/**
 * The generated header. Both modules carry it verbatim, so a reader who opens
 * either one is told the same thing about where the numbers came from.
 */
function header(imports: string): string[] {
	return [
		'// Generated by scripts/build-data.ts from vendor/PeriodicTableJSON.json.',
		`// Upstream: ${SOURCE.repository} at ${SOURCE.commit}`,
		'// Do not edit by hand. Run `bun run data:build` instead.',
		'',
		imports,
		''
	];
}

/**
 * The split is the whole point of this file's second output: `core` is what a
 * cell, a row and a search result print, and `detail` is what only the inspector
 * prints. Both halves state their type, so a field added to `types.ts` and left
 * out of either one fails `bun run check:scripts` instead of vanishing.
 */
function toCore(element: Element): ElementCore {
	return {
		number: element.number,
		symbol: element.symbol,
		name: element.name,
		slug: element.slug,
		category: element.category,
		block: element.block,
		group: element.group,
		period: element.period,
		position: element.position,
		phase: element.phase
	};
}

function toDetail(element: Element): ElementDetail {
	return {
		mass: element.mass,
		meltingPoint: element.meltingPoint,
		boilingPoint: element.boilingPoint,
		density: element.density,
		electronegativity: element.electronegativity,
		electronAffinity: element.electronAffinity,
		ionizationEnergies: element.ionizationEnergies,
		shells: element.shells,
		electronConfiguration: element.electronConfiguration,
		electronConfigurationSemantic: element.electronConfigurationSemantic,
		radii: element.radii,
		discoveredBy: element.discoveredBy,
		namedBy: element.namedBy,
		summary: element.summary,
		image: element.image,
		source: element.source,
		spectralImage: element.spectralImage
	};
}

function renderCore(elements: Element[]): string {
	const lines = [
		...header("import type { ElementCore } from './types.ts';"),
		'export const elements: ElementCore[] = ['
	];
	// One element per line: a data change moves one line, not forty.
	for (const element of elements) lines.push(`\t${JSON.stringify(toCore(element))},`);
	return [...lines, '];', ''].join('\n');
}

function renderDetails(elements: Element[]): string {
	const lines = [
		...header("import type { ElementDetail } from './types.ts';"),
		'export const details: Record<string, ElementDetail> = {'
	];
	// Keyed by symbol, in atomic order so the file reads like the table. The key
	// order is the source order, which is what keeps two runs byte-identical.
	for (const element of elements) {
		lines.push(`\t${JSON.stringify(element.symbol)}: ${JSON.stringify(toDetail(element))},`);
	}
	return [...lines, '};', ''].join('\n');
}
function renderAttribution(): string {
	return [
		'// Generated by scripts/build-data.ts. Do not edit by hand.',
		'',
		'/** Where the element data came from. Printed on /about. */',
		'export const attribution = {',
		`\trepository: ${JSON.stringify(SOURCE.repository)},`,
		`\tlicense: ${JSON.stringify(SOURCE.license)},`,
		`\tlicenseUrl: ${JSON.stringify(SOURCE.licenseUrl)},`,
		`\tcommit: ${JSON.stringify(SOURCE.commit)},`,
		`\tpinnedDate: ${JSON.stringify(SOURCE.pinnedDate)},`,
		`\tsourceUrl: ${JSON.stringify(sourceUrl)}`,
		'} as const;',
		''
	].join('\n');
}

function renderPinned(): string {
	return [
		'# Pinned upstream data',
		'',
		'`PeriodicTableJSON.json` in this directory is copied verbatim from:',
		'',
		`- Repository: ${SOURCE.repository}`,
		`- Commit: ${SOURCE.commit}`,
		`- Raw file: ${sourceUrl}`,
		`- Pinned: ${SOURCE.pinnedDate}`,
		`- Licence: ${SOURCE.license} (inherited from Wikipedia)`,
		'',
		'This file is written by `scripts/build-data.ts` from the same constants it',
		'writes into `src/lib/data/attribution.ts`, so the two cannot disagree. To',
		'upgrade the data, change those constants and re-run `bun run data:build`.',
		''
	].join('\n');
}

const upstream = validate(await Bun.file(VENDOR_JSON).json());
const kept = upstream.filter((element) => element.number !== PREDICTED_PLACEHOLDER_NUMBER);
const dropped = upstream.filter((element) => element.number === PREDICTED_PLACEHOLDER_NUMBER);

// ponytail: one assert instead of a test suite — it is the check that fails if the
// exclusion rule ever stops meaning what the comment above says it means.
if (dropped.length !== 1 || dropped[0]?.symbol !== 'Uue') {
	fail(
		`expected exactly one predicted placeholder (number ${PREDICTED_PLACEHOLDER_NUMBER}, "Uue"), ` +
			`found ${dropped.length}${dropped.length ? `: ${dropped.map((element) => element.symbol).join(', ')}` : ''}`
	);
}

const elements = kept.map(normalize).sort((a, b) => a.number - b.number);

await Bun.write(`${OUT_DIR}/elements.generated.ts`, renderCore(elements));
await Bun.write(`${OUT_DIR}/element-details.generated.ts`, renderDetails(elements));
await Bun.write(`${OUT_DIR}/attribution.ts`, renderAttribution());
await Bun.write(PINNED_MD, renderPinned());

console.log(
	`data:build wrote ${elements.length} elements to src/lib/data/elements.generated.ts (core) ` +
		`and src/lib/data/element-details.generated.ts (detail)`
);
console.log(`data:build dropped 1 predicted placeholder (Uue, number ${PREDICTED_PLACEHOLDER_NUMBER})`);
