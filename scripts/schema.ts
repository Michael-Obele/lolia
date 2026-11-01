// Valibot schema for the fields the UI uses, measured against the vendored file.
//
// Upstream leaves a field out (`null`) rather than omitting it, so almost
// everything here is nullable. Only `name`, `symbol`, `number`, `xpos` and `ypos`
// are hard requirements: without them there is no cell to draw.
//
// Unknown keys are ignored, not rejected. Upstream adding a field must not stop
// a build; upstream changing one we read must.

import * as v from 'valibot';

/** Upstream reports radii as arrays of measurements. `null` and absent both mean "unknown". */
const radius = v.optional(v.nullable(v.array(v.number())));

/** A single measurement upstream may simply not have. */
const measurement = v.nullable(v.number());

/** Free text upstream may not have. */
const text = v.nullable(v.string());

export const elementSchema = v.object({
	name: v.string(),
	symbol: v.string(),
	number: v.number(),
	xpos: v.number(),
	ypos: v.number(),
	atomic_mass: measurement,
	category: v.string(),
	block: text,
	group: measurement,
	period: measurement,
	phase: text,
	density: measurement,
	// Optional as well as nullable: a density without a unit is data we keep, with a `null` unit.
	density_unit: v.optional(v.nullable(v.string())),
	melt: measurement,
	boil: measurement,
	electron_configuration: text,
	electron_configuration_semantic: text,
	shells: v.array(v.number()),
	electron_affinity: measurement,
	electronegativity_pauling: measurement,
	ionization_energies: v.array(v.number()),
	atomic_radii: v.object({
		empirical: radius,
		calculated: radius,
		van_der_waals: radius,
		covalent_single: radius,
		covalent_triple: radius,
		metallic: radius
	}),
	discovered_by: text,
	named_by: text,
	summary: text,
	source: text,
	spectral_img: text,
	image: v.nullable(
		v.object({ url: v.string(), title: v.string(), attribution: v.string() })
	)
});

export type UpstreamElement = v.InferOutput<typeof elementSchema>;

/** The envelope upstream ships: `{ "elements": [...] }`. */
export const envelopeSchema = v.object({ elements: v.array(v.unknown()) });

type PathItem = { origin?: string; key?: unknown };

function receivedOf(input: unknown): string {
	if (input === undefined) return 'undefined';
	if (input === null) return 'null';
	if (Array.isArray(input)) return 'array';
	return typeof input;
}

/**
 * One issue rendered as `"melt" expected number|null, received string`.
 *
 * Valibot reports the failing leaf of `v.nullable(...)` as plain `number`, so the
 * `|null` is recovered by asking the field's own schema whether it accepts null.
 * A nullable field that rejects a string is then described as `number|null` — the
 * truth a reader needs, rather than the internal schema shape.
 */
export function describeIssue(issue: v.BaseIssue<unknown>): string {
	const path = (issue.path ?? []) as PathItem[];

	const field = path
		.map((item, index) => (typeof item.key === 'number' ? `[${item.key}]` : `${index ? '.' : ''}${String(item.key)}`))
		.join('');

	// A missing key has no input to inspect, and valibot describes its expected
	// value as the quoted key itself, so it gets its own message.
	if (path.some((item) => item.origin === 'key')) return `"${field}" is missing`;

	const received = receivedOf((issue as { input?: unknown }).input);

	const top = path[0]?.key;
	const fieldSchema =
		typeof top === 'string' ? (elementSchema.entries as Record<string, v.GenericSchema>)[top] : undefined;
	const nullable = fieldSchema !== undefined && v.safeParse(fieldSchema, null).success;

	const expectedType = String((issue as { expected?: string }).expected ?? issue.type).toLowerCase();
	const expected = nullable ? `${expectedType}|null` : expectedType;

	return `"${field}" expected ${expected}, received ${received}`;
}
