import { describe, expect, test } from 'bun:test';
import { css } from './layout.ts';

// The print contract, held as text rather than as a screenshot: the PDF proof in
// `.superpowers/sdd/task-6-report.md` shows what the page looks like once, and
// these hold the two facts that made it that way — the sheet size, and a dark
// palette that cannot reach the printer.

const flat = css.replace(/\s+/g, ' ');

/** Everything after the print block's opening brace keyword. */
const print = css.slice(css.indexOf('@media print'));

describe('@page', () => {
	test('A4 landscape, 12mm of margin', () => {
		expect(flat).toContain('@page { size: A4 landscape; margin: 12mm; }');
	});

	test('declared once', () => {
		expect(css.split('@page').length - 1).toBe(1);
	});
});

describe('the light palette in print', () => {
	test('the dark block is scoped to screen, so print inherits the light one', () => {
		expect(css.split('@media screen').length - 1).toBe(1);

		// `.dark` exists exactly once, and only behind `@media screen`. A print job
		// therefore never sees it and `:root` supplies the light values.
		expect(css.split('.dark').length - 1).toBe(1);
		expect(css.indexOf('.dark')).toBeGreaterThan(css.indexOf('@media screen'));
	});

	test('print adds no tokens of its own', () => {
		// A `--name:` declaration inside the print block would be a print-only
		// token, which the brief forbids: the light values are reused, not copied.
		expect(print).not.toMatch(/--[a-z0-9-]+:/);
	});
});

describe('@media print', () => {
	test('declared once', () => {
		expect(css.split('@media print').length - 1).toBe(1);
	});

	test('hides the screen-only controls and the element sheet', () => {
		const hidden = print.slice(print.indexOf('{'), print.indexOf('}') + 1);

		for (const selector of ['.app-controls', '.sheet', '.dim', "[role='dialog']"]) {
			expect({ selector, hidden: hidden.includes(selector) }).toEqual({ selector, hidden: true });
		}

		expect(hidden).toContain('display: none');
	});

	test('the category tints survive the print pipeline', () => {
		expect(flat).toContain('print-color-adjust: exact');
	});
});
