import { readFileSync } from 'node:fs';

// layout.css is read as text, because what ships is what the tests check, and
// its declarations are exposed block by block so a value can be pinned where it
// lives — a token that moved from @theme back into :root stops emitting a
// utility, and that has to fail here rather than in a component.

export type Block = { selector: string; values: Map<string, string> };

/** layout.css with its comments stripped — the text every assertion below reads. */
export const css = readFileSync(new URL('../src/routes/layout.css', import.meta.url), 'utf8').replace(
	/\/\*[\s\S]*?\*\//g,
	''
);

/** Split CSS text into declaration blocks, so a duplicate block can be proved fatal. */
export function parse(text: string): Block[] {
	return [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, prelude, body]) => ({
		// The chunk before `{` still carries whatever statement came before it
		// (`@import 'tailwindcss';`), so the selector is the last `;`-free segment.
		selector: (prelude.split(';').pop() ?? '').trim(),
		values: new Map(
			[...body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map(
				([, name, value]) => [name, value.trim()] as [string, string]
			)
		)
	}));
}

export const blocks: Block[] = parse(css);

/**
 * The one block with exactly this selector, e.g. `:root`, `.dark`, `@theme inline`.
 *
 * A duplicate is fatal, not "first one wins": the browser resolves a repeated
 * `:root` by cascade order, so the *last* block is the one that actually applies.
 * Reading the first would let a trailing `:root { --cat-nonmetal: #ff0000; }`
 * redefine a token while every value pin still passed.
 */
export function block(selector: string, list: Block[] = blocks): Block {
	const found = list.filter((candidate) => candidate.selector === selector);
	if (found.length > 1) throw new Error(`layout.css declares \`${selector}\` ${found.length} times`);
	if (!found.length) throw new Error(`layout.css has no \`${selector}\` block`);
	return found[0];
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
