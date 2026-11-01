# Lolia

> The periodic table, made to be looked at.

Lolia is a periodic table of the elements for phones and desktops. The table fills the screen, and touching a cell opens everything known about that element: mass, melting point, electron shells, who found it, and a short description.

One SvelteKit app, built once as static files, shipped twice. Capacitor for Android, Tauri for Windows, Linux and macOS.

## Status

Scaffold only, 2026-10-31. The two shells boot the same build. No table, no data, no design yet.

## What is here

| Path | What it is |
| --- | --- |
| `src/` | the SvelteKit app |
| `android/` | Capacitor Android project |
| `src-tauri/` | Tauri desktop project |
| `scripts/sync-version.ts` | copies the version from `package.json` into `tauri.conf.json` so the two cannot drift |

The app runs in SPA mode: `@sveltejs/adapter-static` with `fallback: 'index.html'` and `ssr = false`. Both shells load the app from disk, so nothing may render on a server.

## Develop

Requires Bun and Node 22.17 or newer.

```bash
bun install
bun run dev            # web, http://localhost:5174
bunx tauri dev         # desktop window
bunx cap sync          # copy the build into android/
bunx cap run android   # needs an emulator or a device
```

Building the web app: `bun run build`. Output goes to `build/`, which is both the Capacitor `webDir` and the Tauri `frontendDist`.

## Desktop builds and warnings

`bunx tauri build` produces a binary for the machine you run it on. Linux builds Linux. Windows and macOS builds come from CI, not from a Linux box.

The installers are **unsigned for now**. Windows shows a SmartScreen warning and macOS refuses the first launch until you allow it. Signing needs a Windows certificate and a paid Apple developer account. That is a distribution decision, not a code problem.

## Data and licence

Element data will come from [Bowserinator/Periodic-Table-JSON](https://github.com/Bowserinator/Periodic-Table-JSON), which is licensed **CC BY-SA 3.0** and derives from Wikipedia. Attribution is required, and share-alike attaches to the data.

That is why the app will ship an about page naming the source and the pinned commit, and why the data will live in its own files, separate from the app code. Not added yet.

## Plan

The full plan lives in a local working copy at `.plan/`, which is gitignored and never published. It covers the design system, the motion specification, the architecture, the milestones, and the decisions behind them.
