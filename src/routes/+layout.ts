// Both native shells load the app from the filesystem, so nothing may render
// on a server. SPA mode also lets Tauri and Capacitor APIs run at load.
export const ssr = false;
export const prerender = false;
