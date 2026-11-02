import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// The version is read, never written down: `package.json` is the only place it is
// typed, and every surface that shows it (the about page, the shells) gets this
// same string from the build.
const { version } = JSON.parse(
	readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

export default defineConfig({
	// Inlined at build time, so the client never fetches `package.json` and no
	// release can ship a version from a different file than the installer's.
	define: { __APP_VERSION__: JSON.stringify(version) },
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// SPA output. Capacitor and Tauri both load index.html from disk, so there
			// is no server and the fallback page is what every route resolves to.
			adapter: adapter({ fallback: 'index.html' })
		})
	],

	// Tauri's devUrl is pinned to 5174, so vite must never pick its own port.
	// Without strictPort, a busy port makes vite move to 5175 while Tauri keeps
	// waiting on 5174, and the desktop window stays blank with no error worth
	// reading. 5173 is left alone because other projects on this machine use it.
	server: { port: 5174, strictPort: true },

	// `svelte-idb/svelte` ships runes in `.svelte.js`, so the svelte plugin has to
	// compile them against this app's runtime. Pre-bundled, the optimizer gives
	// them its own copy of `svelte/internal/client` — and a `$state` from that copy
	// invalidates nothing a component derived from it, which is how the settings
	// dialog's cached count sat at zero through a full download.
	optimizeDeps: { exclude: ['svelte-idb'] }
});
