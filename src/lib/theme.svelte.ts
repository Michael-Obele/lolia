// The theme is one switch: the `.dark` class on <html>. src/app.html ships it as
// the default; this module only restores a stored choice and persists a new one.
// Storage and document are both optional — a failure means memory-only, not a crash.

export type Theme = 'dark' | 'light';

const KEY = 'lolia.theme';

function readTheme(): Theme {
	try {
		return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
	} catch {
		return 'dark';
	}
}

function paint(theme: Theme): void {
	try {
		document.documentElement.classList.toggle('dark', theme === 'dark');
	} catch {
		// Prerendering: there is no document, and nothing to paint.
	}
}

let current = $state<Theme>(readTheme());

paint(current);

export function getTheme(): Theme {
	return current;
}

export function setTheme(theme: Theme): void {
	current = theme;
	paint(theme);
	try {
		localStorage.setItem(KEY, theme);
	} catch {
		// Memory only.
	}
}

export function toggleTheme(): void {
	setTheme(current === 'dark' ? 'light' : 'dark');
}
