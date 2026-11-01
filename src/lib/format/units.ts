// The one place numbers become text. Values arrive from the generated data, so
// nothing here converts anything: Kelvin stays Kelvin at rest, and a density
// unit is whatever upstream said — never a unit this module invented.

/** Printed wherever the data has no value. One dash, never `null`, never a gap. */
export const NOT_KNOWN = '—';

/** The tooltip behind every em dash, naming the field it stands in for. */
export function notKnownTitle(label: string): string {
	return `${label} is not known for this element.`;
}

/** Fixed decimals with trailing zeros trimmed: `1811.000` reads `1811`. */
export function decimal(value: number, places: number): string {
	const fixed = value.toFixed(places);
	return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
}

/**
 * Counts and bare measurements: atomic number, group, density, electronegativity.
 * Integers stay integers, and no unit is ever attached that the data lacks.
 */
export function formatPlain(value: number | null): string | null {
	return value === null ? null : String(value);
}

/** Atomic mass, at the three decimals the table quotes. */
export function formatMass(value: number | null): string | null {
	return value === null ? null : decimal(value, 3);
}

/** Temperatures: Kelvin, no degree sign, and no conversion at rest. */
export function formatKelvin(value: number | null): string | null {
	return value === null ? null : `${decimal(value, 3)} K`;
}

/** Radii, every kind of them picometres upstream. */
export function formatPicometres(value: number | null): string | null {
	return value === null ? null : `${decimal(value, 1)} pm`;
}

const SUPERSCRIPTS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

/**
 * Stored bytes: under a thousand it is bytes, above that one decimal and a unit
 * from the thousand ladder. Nothing rounds a real size up to a unit it lacks.
 */
export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
	const units = ['B', 'kB', 'MB', 'GB'];
	let value = bytes;
	let unit = 0;
	while (value >= 1000 && unit < units.length - 1) {
		value /= 1000;
		unit += 1;
	}
	return unit === 0 ? `${value} B` : `${decimal(value, 1)} ${units[unit]}`;
}

/**
 * `g/cm3` as `g/cm³`. A null unit stays null: density is the one field where a
 * missing unit must read as missing, not as grams per cubic centimetre.
 */
export function densityUnit(unit: string | null): string | null {
	if (unit === null) return null;
	return unit.replace(/\d+/g, (digits) =>
		[...digits].map((digit) => SUPERSCRIPTS[Number(digit)] ?? digit).join('')
	);
}
