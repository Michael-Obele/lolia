import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
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
	server: { port: 5174, strictPort: true }
});
