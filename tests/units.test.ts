import { describe, expect, test } from 'bun:test';
import {
	NOT_KNOWN,
	decimal,
	densityUnit,
	formatBytes,
	formatKelvin,
	formatMass,
	formatPicometres,
	formatPlain,
	notKnownTitle
} from '../src/lib/format/units.ts';

// The formatter is the only place a number becomes visible, so these pins are
// the unit story: Kelvin never converts, a missing unit is never invented, and
// a missing value is a dash with a reason rather than `null`.

describe('numbers', () => {
	test('integers stay plain', () => {
		expect(formatPlain(26)).toBe('26');
		expect(formatPlain(0)).toBe('0');
		expect(formatPlain(null)).toBeNull();
	});

	test('mass carries three decimals', () => {
		expect(formatMass(55.8452)).toBe('55.845');
		expect(formatMass(1.008)).toBe('1.008');
		expect(formatMass(294)).toBe('294');
		expect(formatMass(null)).toBeNull();
	});

	test('trailing zeros are trimmed, real zeros are not', () => {
		expect(decimal(1811, 3)).toBe('1811');
		expect(decimal(1811.5, 3)).toBe('1811.5');
		expect(decimal(0.5, 3)).toBe('0.5');
		expect(decimal(1000, 3)).toBe('1000');
	});
});

describe('units', () => {
	test('Kelvin, no degree sign, no conversion', () => {
		expect(formatKelvin(1811)).toBe('1811 K');
		expect(formatKelvin(13.99)).toBe('13.99 K');
		expect(formatKelvin(453.65)).toBe('453.65 K');
		expect(formatKelvin(null)).toBeNull();
	});

	test('radii are picometres', () => {
		expect(formatPicometres(140)).toBe('140 pm');
		expect(formatPicometres(181.8)).toBe('181.8 pm');
		expect(formatPicometres(null)).toBeNull();
	});

	test('density unit is read from the data, not assumed', () => {
		expect(densityUnit('g/cm3')).toBe('g/cm³');
		expect(densityUnit('g/L')).toBe('g/L');
		expect(densityUnit(null)).toBeNull();
	});
});

describe('nulls', () => {
	test('one dash and one reason', () => {
		expect(NOT_KNOWN).toBe('—');
		expect(notKnownTitle('melting point')).toBe('melting point is not known for this element.');
	});
});

describe('storage sizes', () => {
	test('bytes below a thousand, one decimal above it', () => {
		expect(formatBytes(0)).toBe('0 B');
		expect(formatBytes(999)).toBe('999 B');
		expect(formatBytes(24_500_000)).toBe('24.5 MB');
		expect(formatBytes(2_000_000)).toBe('2 MB');
	});

	test('a missing or non-finite size is zero, never NaN', () => {
		expect(formatBytes(-1)).toBe('0 B');
		expect(formatBytes(Number.NaN)).toBe('0 B');
	});
});
