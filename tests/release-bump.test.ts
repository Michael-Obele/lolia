import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

// The bump rule, held as config rather than as behaviour. release-please infers
// the version itself, and its own strategy file ends in an unconditional
// `return new PatchVersionUpdate()` — so every commit type is already a patch,
// and only two branches can escalate. Both are narrowed here, and these tests
// are what stop a later edit from quietly reintroducing a major.
//
// Verified against release-please 17.11.2: at 0.1.0, `fix`/`feat`/`perf`/
// `refactor`/`chore`/`docs`/`ci`/`test`/`style` all give 0.1.1, `feat!` and a
// `BREAKING CHANGE` footer give 0.2.0, and `Release-As: 1.0.0` gives 1.0.0.

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

type Config = {
	'release-type'?: string;
	versioning?: string;
	'bump-minor-pre-major'?: boolean;
	'bump-patch-for-minor-pre-major'?: boolean;
	'include-component-in-tag'?: boolean;
	'include-v-in-tag'?: boolean;
	draft?: boolean;
	'force-tag-creation'?: boolean;
	packages?: Record<string, unknown>;
};

const config: Config = JSON.parse(read('release-please-config.json'));
const manifest: Record<string, string> = JSON.parse(read('.release-please-manifest.json'));
const pkg: { version: string } = JSON.parse(read('package.json'));
const releaseWorkflow = read('.github/workflows/release.yml');

/** The one glob release.yml listens for, e.g. `v*`. */
const tagTrigger = /tags:\s*\['([^']+)'\]/.exec(releaseWorkflow)?.[1];

describe('the bump rule, at 0.x', () => {
	test('a `!` is a minor, not a major', () => {
		// Without this, `!` and a BREAKING CHANGE footer both cut a major.
		expect(config['bump-minor-pre-major']).toBe(true);
	});

	test('a feature is a patch, not a minor', () => {
		// Without this, `feat` is the one type that escalates on its own.
		expect(config['bump-patch-for-minor-pre-major']).toBe(true);
	});

	test('no versioning strategy overrides the flag, because it would flatten `!`', () => {
		// `always-bump-patch` short-circuits `determineReleaseType` and returns a
		// patch for everything — including a breaking change. It looks like the
		// simple answer and silently deletes the `!` rule.
		expect(config.versioning).toBeUndefined();
	});

	test('the release is driven off package.json, the only hand-edited version', () => {
		expect(config['release-type']).toBe('node');
		expect(Object.keys(config.packages ?? {})).toEqual(['.']);
	});
});

describe('the tag the release cuts', () => {
	test('is `vX.Y.Z`, which is the glob release.yml listens for', () => {
		expect(tagTrigger).toBe('v*');
		expect(config['include-v-in-tag']).toBe(true);
		expect(config['include-component-in-tag']).toBe(false);
		expect(`v${manifest['.']}`.startsWith('v')).toBe(true);
	});

	test('a component prefix would silently stop release.yml matching', () => {
		// `lolia-v0.2.0` does not start with `v`, so `on.push.tags: ['v*']` never
		// fires and the release is tagged but never built. This is why the option
		// stays false, and why it is asserted rather than assumed.
		expect(`lolia-v${manifest['.']}`.startsWith('v')).toBe(false);
	});

	test('a draft release still creates the tag, or nothing would trigger', () => {
		// GitHub does not create a git tag for a draft release until it is
		// published. `force-tag-creation` is the option that makes it exist now.
		expect(config.draft).toBe(true);
		expect(config['force-tag-creation']).toBe(true);
	});
});

describe('the manifest', () => {
	test('carries the version package.json declares, so one bump cannot half-apply', () => {
		// A hand edit to one of these and not the other is how a release ends up
		// tagged for a version the app does not report.
		expect(manifest['.']).toBe(pkg.version);
	});

	test('is a plain x.y.z, which is what the Android versionCode scheme can express', () => {
		expect(/^\d+\.\d+\.\d+$/.test(manifest['.'] ?? '')).toBe(true);
	});
});
