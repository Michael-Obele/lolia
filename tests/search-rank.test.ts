import { describe, expect, test } from 'bun:test';
import { rank } from '../src/lib/search/rank.ts';

// The ranker is the whole search: five tiers, atomic number inside a tier, and a
// printed reason. These cases pin the order, not the plumbing.

const symbols = (query: string) => rank(query).map((match) => match.element.symbol);
const tiers = (query: string) => [...new Set(rank(query).map((match) => match.tier))];
const first = (query: string) => rank(query)[0];

describe('the five tiers', () => {
	test('1 — exact symbol', () => {
		expect(first('fe')).toMatchObject({
			tier: 1,
			reason: 'matches symbol',
			element: { symbol: 'Fe', name: 'Iron' }
		});
	});

	test('2 — symbol prefix', () => {
		// "a" is not a symbol, but eight symbols start with it. Aluminium is the
		// lowest numbered of them, so it wins on the tie break alone.
		const match = first('a');
		expect(match).toMatchObject({ tier: 2, reason: 'starts with the symbol' });
		expect(match.element.symbol).toBe('Al');
	});

	test('3 — name prefix', () => {
		const match = first('cal');
		expect(match).toMatchObject({ tier: 3, reason: 'name starts with the query' });
		expect(match.element.symbol).toBe('Ca');
	});

	test('3 — the whole name is reported as an exact match', () => {
		expect(first('iron')).toMatchObject({ tier: 3, reason: 'matches name' });
	});

	test('4 — name substring, below every name prefix', () => {
		const matches = rank('ium');
		expect(matches.every((match) => match.tier === 4)).toBe(true);
		expect(matches[0].reason).toBe('name contains the query');
		// Iron is a name prefix for "iro", not a substring hit for "ium".
		expect(symbols('ium')).not.toContain('Fe');
	});

	test('5 — category word prefix', () => {
		const matches = rank('meta');
		expect(matches.length).toBeGreaterThan(0);
		expect(tiers('meta')).toEqual([5]);
		expect(matches.every((match) => match.reason.startsWith('category: '))).toBe(true);
		expect(new Set(matches.map((match) => match.reason))).toContain('category: transition metal');
		expect(new Set(matches.map((match) => match.reason))).toContain('category: metalloid');
	});

	test('5 — block, spelled out so it cannot collide with a name', () => {
		const matches = rank('f-block');
		expect(matches.length).toBeGreaterThan(0);
		expect(matches.every((match) => match.tier === 5 && match.reason === 'block f')).toBe(true);
		expect(matches.every((match) => match.element.block === 'f')).toBe(true);
	});

	test('every result carries a reason', () => {
		for (const match of rank('a')) expect(match.reason.length).toBeGreaterThan(0);
	});
});

describe('ordering', () => {
	test('ties break by atomic number, not by alphabet', () => {
		// Alphabetical would put Cs before Cu and Cn before Co. The table's own
		// order is atomic number, and that is the order a learner already knows.
		// Tiers 1 and 2 only: "c" is also inside fourteen names, which is tier 4
		// and must never rise above a symbol hit.
		const symbolHits = rank('c')
			.filter((match) => match.tier <= 2)
			.map((match) => match.element.symbol);

		expect(symbolHits).toEqual([
			'C',
			'Cl',
			'Ca',
			'Cr',
			'Co',
			'Cu',
			'Cd',
			'Cs',
			'Ce',
			'Cm',
			'Cf',
			'Cn'
		]);
	});

	test('a lower tier never outranks a higher one', () => {
		const ordered = rank('c').map((match) => match.tier);
		expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
	});

	test('fe finds Iron first and the iron family after it', () => {
		const found = rank('fe');
		expect(found[0].element.symbol).toBe('Fe');
		expect(tiers('fe')[0]).toBe(1);
	});
});

describe('folding', () => {
	test('case does not matter', () => {
		expect(symbols('IRON')).toEqual(symbols('iron'));
		expect(symbols('Fe')).toEqual(symbols('fe'));
	});

	test('surrounding space does not matter', () => {
		expect(symbols('  iron  ')).toEqual(symbols('iron'));
	});

	test('diacritics are stripped before comparing', () => {
		expect(first('ǐron').element.symbol).toBe('Fe');
	});

	test('an empty or blank query finds nothing', () => {
		expect(rank('')).toEqual([]);
		expect(rank('   ')).toEqual([]);
	});
});

describe('the alias table', () => {
	const cases: [string, string, string][] = [
		['aluminum', 'Al', 'Aluminium'],
		['sulphur', 'S', 'Sulfur'],
		['caesium', 'Cs', 'Cesium'],
		['wolfram', 'W', 'Tungsten'],
		['natrium', 'Na', 'Sodium'],
		['ferrum', 'Fe', 'Iron'],
		['plumbum', 'Pb', 'Lead']
	];

	for (const [typed, symbol, name] of cases) {
		test(`${typed} finds ${name}`, () => {
			expect(first(typed)).toMatchObject({
				tier: 3,
				reason: 'matches name',
				element: { symbol, name }
			});
		});
	}

	test('the alias resolves to the same results as the real spelling', () => {
		expect(symbols('aluminium')).toEqual(symbols('aluminum'));
		expect(symbols('sulphur')).toEqual(symbols('sulfur'));
	});

	test('the spelling the data uses needs no alias at all', () => {
		expect(first('aluminium')).toMatchObject({ tier: 3, reason: 'matches name' });
	});

	test('a misspelling outside the table is still a miss', () => {
		expect(rank('alluminium')).toEqual([]);
	});
});
