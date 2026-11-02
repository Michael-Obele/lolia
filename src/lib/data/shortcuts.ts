/**
 * Every keyboard gesture the app answers, in the order a reader meets them.
 *
 * One list, two readers: the settings dialog and the about page. A shortcut that
 * is written down in two places is a shortcut that will disagree with itself.
 */
export const shortcuts = [
	{ keys: 'Arrow keys', action: 'Move between cells' },
	{ keys: 'Home, End', action: 'Jump to the ends of a row' },
	{ keys: 'Page Up, Page Down', action: 'Move by period' },
	{ keys: 'Enter', action: 'Open the element panel' },
	{ keys: 'Escape', action: 'Close the panel' },
	{ keys: 'Cmd K, Ctrl K', action: 'Search every element' }
] as const;
