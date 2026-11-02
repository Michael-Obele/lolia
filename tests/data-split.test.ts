// The payload is split in two, and which half a route carries is the budget.
//
// `elements.generated.ts` is the core: eleven fields, every route may have it.
// `element-details.generated.ts` is everything else, and it lives in a chunk of
// its own so the table route never pays for a summary it does not print. D15's
// 110 KB reopen trigger was fired by exactly that cost, so this file holds the
// line: the table route's static graph must not contain the detail module.
//
// The graph is walked from the source, not from a build, so the test runs in
// `bun test` with no `build/` directory and no browser.

import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { details } from '../src/lib/data/element-details.generated.ts';
import { elements } from '../src/lib/data/elements.generated.ts';
import type { ElementCore, ElementDetail } from '../src/lib/data/types.ts';

const ROOT = resolve(import.meta.dir, '..');

/** A static import: `import x from '…'`, `import '…'`, or `export … from '…'`. */
const STATIC_IMPORT =
	/(?:^|[^\w$.])import\s+(?!\()(?:[^'"()`]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
const STATIC_REEXPORT = /(?:^|[^\w$.])export\s+(?:[^'"()`]*?\sfrom\s*)['"]([^'"]+)['"]/g;

/**
 * `$lib/x` and `#lib/x` both land in `src/lib`; a relative specifier resolves
 * against the importing file. Everything else (`$app/…`, `svelte`, `bits-ui`)
 * is virtual or a package, and has no source file to walk into.
 */
function resolveSpecifier(from: string, specifier: string): string | null {
	let base: string;
	if (specifier.startsWith('$lib/')) base = join(ROOT, 'src/lib', specifier.slice(5));
	else if (specifier.startsWith('#lib/')) base = join(ROOT, 'src/lib', specifier.slice(5));
	else if (specifier.startsWith('.')) base = resolve(dirname(from), specifier);
	else return null;

	for (const candidate of [base, `${base}.ts`, `${base}.svelte`, `${base}/index.ts`]) {
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

/** Every file reachable from `entries` through static imports only. */
function staticGraph(entries: string[]): Set<string> {
	const seen = new Set<string>();
	const queue = [...entries];

	while (queue.length > 0) {
		const file = queue.pop()!;
		if (seen.has(file)) continue;
		seen.add(file);

		const source = readFileSync(file, 'utf8');
		for (const pattern of [STATIC_IMPORT, STATIC_REEXPORT]) {
			pattern.lastIndex = 0;
			for (const match of source.matchAll(pattern)) {
				const resolved = resolveSpecifier(file, match[1]);
				if (resolved !== null && !seen.has(resolved)) queue.push(resolved);
			}
		}
	}

	return seen;
}

const paths = (graph: Set<string>) => [...graph].map((file) => relative(ROOT, file)).sort();

describe('the table route does not carry the detail payload', () => {
	// `/` is the root layout plus the table page. Nothing else renders on it.
	const tableRoute = staticGraph([
		join(ROOT, 'src/routes/+layout.ts'),
		join(ROOT, 'src/routes/+layout.svelte'),
		join(ROOT, 'src/routes/+page.svelte')
	]);

	test('the walk reaches real files, so a miss below means something', () => {
		const walked = paths(tableRoute);
		// The core payload and the grid are in the graph; without them the walker
		// would be silently returning nothing and this whole file proves nothing.
		expect(walked).toContain('src/lib/data/elements.generated.ts');
		expect(walked).toContain('src/lib/components/table/Grid.svelte');
	});

	test('the detail module is absent from the graph', () => {
		expect(paths(tableRoute)).not.toContain('src/lib/data/element-details.generated.ts');
	});

	test('the inspector, and the two routes that print it, are absent too', () => {
		const walked = paths(tableRoute);
		expect(walked).not.toContain('src/lib/components/inspector/Inspector.svelte');
		expect(walked).not.toContain('src/lib/components/compare/ComparePanel.svelte');
		expect(walked).not.toContain('src/lib/data/metrics.ts');
	});

	test('the lazy loader is in the graph but only imports the detail module lazily', () => {
		// `details.ts` is allowed: its `import()` is a chunk of its own, which is the
		// whole mechanism. What must not appear is a *static* import of the payload.
		const source = readFileSync(join(ROOT, 'src/lib/data/details.ts'), 'utf8');
		expect(source).toContain("import('#lib/data/element-details.generated.ts')");
		expect(source).not.toMatch(/import\s+\w+\s+from\s+['"][^'"]*element-details/);
	});
});

describe('the split keeps every field', () => {
	const CORE_FIELDS = [
		'number',
		'symbol',
		'name',
		'slug',
		'category',
		'block',
		'group',
		'period',
		'position',
		'phase'
	] as const;

	const DETAIL_FIELDS = [
		'mass',
		'meltingPoint',
		'boilingPoint',
		'density',
		'electronegativity',
		'electronAffinity',
		'ionizationEnergies',
		'shells',
		'electronConfiguration',
		'electronConfigurationSemantic',
		'radii',
		'discoveredBy',
		'namedBy',
		'summary',
		'image',
		'source',
		'spectralImage'
	] as const;

	test('core carries its ten fields and no detail field', () => {
		for (const element of elements) {
			expect(Object.keys(element).sort()).toEqual([...CORE_FIELDS].sort());
		}
	});

	test('detail carries its seventeen fields and no core field', () => {
		for (const detail of Object.values(details)) {
			expect(Object.keys(detail).sort()).toEqual([...DETAIL_FIELDS].sort());
		}
	});

	test('every element has a detail row, keyed by its own symbol', () => {
		expect(Object.keys(details)).toHaveLength(elements.length);
		for (const core of elements) {
			expect(details[core.symbol]).toBeDefined();
		}
	});

	test('nothing in the two halves overlaps', () => {
		const core = new Set<string>(CORE_FIELDS);
		const overlap = DETAIL_FIELDS.filter((field) => core.has(field));
		expect(overlap).toEqual([]);
	});

	test('the composed Element is both halves, so old code keeps its type', () => {
		const core: ElementCore = elements[0];
		const detail: ElementDetail = details[core.symbol];
		const both = { ...core, ...detail };
		expect(both.number).toBe(core.number);
		expect(both.symbol).toBe(core.symbol);
		expect(Object.keys(both)).toHaveLength(CORE_FIELDS.length + DETAIL_FIELDS.length);
	});

	test('the core file is still sorted by atomic number', () => {
		const numbers = elements.map((element) => element.number);
		expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
	});
});
