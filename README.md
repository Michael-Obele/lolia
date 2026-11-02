# Lolia

> The periodic table, made to be looked at.

Lolia is a periodic table of the elements. The table fills the screen, and touching a
cell opens everything known about that element: mass, melting point, electron shells,
who found it, and a short description. There is a table, a list for reading straight
through, a search palette, a two-to-four element comparison tray, and a trends view.

One SvelteKit app, built once as static files and shipped three ways: an Android app, a
desktop app for Windows, macOS and Linux, and the web.

## What ships

| Output | Shell | Artifact |
| --- | --- | --- |
| Android | Capacitor | `.aab` for Play, `.apk` for a device |
| Windows | Tauri | `.msi` and `.exe` (NSIS) |
| macOS | Tauri | `.dmg` |
| Linux | Tauri | `.AppImage` and `.deb` |
| Web | none — the same `build/` directory | static site on Cloudflare Pages |

All five come out of one build. `.github/workflows/release.yml` runs on a `v*` tag:
three desktop runners build with `tauri-action` and attach their installers to the
release, and an Android job produces the bundle. `.github/workflows/deploy-web.yml`
publishes the same `build/` directory to a domain root.

The version is never written down here or in the code. `package.json` is the only place
it is typed; `scripts/sync-version.ts` copies it into `tauri.conf.json`, `Cargo.toml` and
the Android manifest, the build inlines it for the about page, and a release is named
after the tag. See the [releases page](https://github.com/Michael-Obele/lolia/releases)
for the current one.

## Requirements

Bun and Node 22.17 or newer. For the desktop build, the Rust toolchain, plus — on Linux
— WebKitGTK 4.1 and the usual Tauri packaging libraries. For the Android build, JDK 21
and the Android SDK.

## Run it

```bash
bun install
bun run dev            # web, http://localhost:5174
```

The port is pinned to 5174 with `strictPort`. 5173 is left to other projects on this
machine, and Tauri's `devUrl` points at 5174, so a busy port fails loudly instead of
opening a blank desktop window.

| Command | What it does |
| --- | --- |
| `bun run dev` | the app in a browser |
| `bun run build` | regenerates the element data, then writes `build/` |
| `bun run preview` | serves `build/` locally |
| `bun run check` | type-check the app, the build scripts and the tests |
| `bun test` | the unit tests |
| `bun run version:sync` | copies `package.json`'s version into every shell |
| `bun run data:build` | rebuilds `src/lib/data/*.generated.ts` from the vendored JSON |

## Build each shell

**Desktop.** `bunx tauri build` produces the installers for the machine you run it on.
A Linux box builds Linux; the Windows and macOS installers come from CI.

**Android.** `bunx cap sync android`, then
`bunx cap build android --androidreleasetype AAB`. Capacitor signs only when it is given
a keystore, so the CI job passes `--keystorepath`, `--keystorepass`, `--keystorealias`
and `--keystorealiaspass` from repository secrets when they exist. Without them the
artifact is **unsigned**: it installs on a device, and Play will refuse it.

**Web.** `bun run build`, then serve `build/` from a domain root. The asset URLs are
absolute (`/_app/...`), which is what the two native shells need; a subpath deploy would
require a `base` path and break both of them.

## Unsigned installers

**The Windows and macOS installers are unsigned.** There is no Windows code-signing
certificate and no paid Apple developer account behind this project, so:

- **Windows** shows a SmartScreen warning. *More info* → *Run anyway*.
- **macOS** refuses the first launch. Allow it in *System Settings → Privacy & Security*,
  or clear the quarantine flag:
  `xattr -d com.apple.quarantine /Applications/Lolia.app`.

Signing is a distribution decision, not a code problem, and it is not planned for this
release.

## iOS is not in this version

iOS needs a Mac, Xcode and a developer account, and there is no Mac here. Android and the
three desktops are the v0.1 product. `@capacitor/ios` is not installed. When a Mac
appears, the app code does not change — only the shell, the icons and a build runner.

## Element data and licence

Every number, name and description comes from
[Bowserinator/Periodic-Table-JSON](https://github.com/Bowserinator/Periodic-Table-JSON),
which is licensed [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) and
draws on Wikipedia. Lolia reads one pinned commit, recorded in `vendor/PINNED.md` and
repeated on the app's about page, so a release always shows the data it was built with.

The licence is share-alike: the element data stays under CC BY-SA 3.0, and anything
built from it has to carry the same licence and the same attribution. The application
code around the data is not affected by it. A copy of the notice is on `/about` inside
the app, which is also where the version and the keyboard shortcuts live.

## Repository layout

| Path | What it is |
| --- | --- |
| `src/` | the SvelteKit app |
| `src/lib/data/` | the generated element data and the attribution it must carry |
| `scripts/` | the data build and the version sync |
| `android/` | the Capacitor Android project |
| `src-tauri/` | the Tauri desktop project |
| `tests/` | the unit tests: the ranker, the formatters, the tokens, the motion core |
| `.github/workflows/` | `ci`, `release`, `deploy-web` |

The app runs as a single-page app: `@sveltejs/adapter-static` with
`fallback: 'index.html'` and `ssr = false`. Both native shells load it from disk, so
nothing renders on a server.
