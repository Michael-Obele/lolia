import { readFileSync } from 'node:fs';

// layout.css is read as text, because what ships is what the tests check, and
// its declarations are exposed block by block so a value can be pinned where it
// lives — a token that moved from @theme back into :root stops emitting a
// utility, and that has to fail here rather than in a component.

export type Block = { selector: string; values: Map<string, string> };

const source = readFileSync(new URL('../src/routes/layout.css', import.meta.url), 'utf8').replace(
	/\/\*[\s\S]*?\*\//g,
	''
);

export const blocks: Block[] = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, prelude, body]) => ({
	// The chunk before `{` still carries whatever statement came before it
	// (`@import 'tailwindcss';`), so the selector is the last `;`-free segment.
	selector: (prelude.split(';').pop() ?? '').trim(),
	values: new Map(
		[...body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()] as [string, string])
	)
}));

/** The block with exactly this selector, e.g. `:root`, `.dark`, `@theme inline`. */
export function block(selector: string): Block {
	const found = blocks.find((candidate) => candidate.selector === selector);
	if (!found) throw new Error(`layout.css has no \`${selector}\` block`);
	return found;
}

/** Every selector that declares this token (names carry no leading dashes). */
export function declaredIn(name: string): string[] {
	return blocks.filter((candidate) => candidate.values.has(name)).map((candidate) => candidate.selector);
}

/** The first declaration of a token, wherever it lives. */
export function valueOf(name: string): string {
	for (const candidate of blocks) {
		const found = candidate.values.get(name);
		if (found !== undefined) return found;
	}
	throw new Error(`layout.css does not declare --${name}`);
}

/** Every token name declared anywhere in the file. */
export function names(): string[] {
	return [...new Set(blocks.flatMap((candidate) => [...candidate.values.keys()]))];
}
