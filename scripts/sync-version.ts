// One version, one source.
//
// `package.json` is the only place a version is written by hand. Everything that
// ships reads it from here: the Tauri config, the Rust crate, and the Android
// manifest. Run before every build so an installer can never report a different
// number than the app inside it, and so the Android versionCode always climbs.
//
// Android needs an integer versionCode that increases on every release. It is
// derived from the semver, never typed: major * 10000 + minor * 100 + patch.
// 0.0.1 -> 1, 0.1.0 -> 100, 1.2.3 -> 10203. Supports up to 99 of each, which is
// more releases than this app will ever have, and it fails loudly past that.
const root = `${import.meta.dir}/..`;
const pkg = await Bun.file(`${root}/package.json`).json();
const version: string = pkg.version;

const [, major, minor, patchLevel] = /^(\d+)\.(\d+)\.(\d+)$/.exec(version) ?? [];
if (!major || Number(minor) > 99 || Number(patchLevel) > 99) {
	console.error(
		`package.json version "${version}" is not a x.y.z semver, or y/z exceed 99. ` +
			`The Android versionCode scheme cannot express it.`
	);
	process.exit(1);
}
const versionCode = Number(major) * 10_000 + Number(minor) * 100 + Number(patchLevel);

let changed = 0;

/** Replace the first line matching `pattern`, and report whether it moved. */
async function patch(path: string, pattern: RegExp, replacement: string) {
	const file = Bun.file(path);
	const text = await file.text();
	if (pattern.test(text) === false) {
		console.warn(`  ${path}: no line matched ${pattern}`);
		return;
	}
	const next = text.replace(pattern, replacement);
	if (next === text) return;
	await Bun.write(path, next);
	changed++;
	// Log the line that actually changed, not the replacement template, which
	// still contains `$1` when the pattern captured a prefix.
	const before = text.split('\n');
	const after = next.split('\n');
	const moved = after.findIndex((line, i) => line !== before[i]);
	console.log(`  ${path.split('/').pop()}: ${after[moved]?.trim()}`);
}

// Tauri. The bundle reads its version from here.
await patch(
	`${root}/src-tauri/tauri.conf.json`,
	/"version":\s*"[^"]*"/,
	`"version": "${version}"`
);

// The Rust crate. Tauri does not require them to agree, but a `Cargo.toml` left
// at the scaffold default reports 0.1.0 in `tauri info` forever.
await patch(`${root}/src-tauri/Cargo.toml`, /^version\s*=\s*"[^"]*"/m, `version = "${version}"`);
await patch(
	`${root}/src-tauri/Cargo.toml`,
	/^description\s*=\s*"[^"]*"/m,
	`description = "Lolia, the periodic table"`
);
await patch(`${root}/src-tauri/Cargo.toml`, /^license\s*=\s*"[^"]*"/m, `license = "CC-BY-SA-3.0"`);
await patch(
	`${root}/src-tauri/Cargo.toml`,
	/^repository\s*=\s*"[^"]*"/m,
	`repository = "https://github.com/Michael-Obele/lolia"`
);

// Android. versionCode must climb on every upload; Play rejects a repeat.
const gradle = `${root}/android/app/build.gradle`;
await patch(gradle, /^(\s*versionCode\s+)\d+/m, `$1${versionCode}`);
await patch(gradle, /^(\s*versionName\s+)"[^"]*"/m, `$1"${version}"`);

console.log(
	changed === 0
		? `every target already at ${version} (versionCode ${versionCode})`
		: `${changed} file(s) synced to ${version} (versionCode ${versionCode})`
);
