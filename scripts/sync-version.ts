// One version, one source. Tauri reads its version from tauri.conf.json, the app
// reads it from package.json. Copy one into the other before every desktop build
// so an installer can never report a different number than the app it shipped.
const root = `${import.meta.dir}/..`;
const pkg = await Bun.file(`${root}/package.json`).json();
const confPath = `${root}/src-tauri/tauri.conf.json`;
const conf = await Bun.file(confPath).json();

if (conf.version !== pkg.version) {
	conf.version = pkg.version;
	await Bun.write(confPath, `${JSON.stringify(conf, null, 2)}\n`);
	console.log(`tauri.conf.json version -> ${pkg.version}`);
} else {
	console.log(`tauri.conf.json version already ${pkg.version}`);
}
