import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'chenhub-theme';

let current = $state<Theme>(getInitial());

function getInitial(): Theme {
	if (!browser) return 'system';
	return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'system';
}

function apply(theme: Theme) {
	if (!browser) return;
	const root = document.documentElement;
	if (theme === 'system') {
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		root.classList.toggle('dark', prefersDark);
	} else {
		root.classList.toggle('dark', theme === 'dark');
	}
}

if (browser) {
	apply(current);
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (current === 'system') apply('system');
	});
}

export const theme = {
	get value() {
		return current;
	},
	set(value: Theme) {
		current = value;
		if (browser) {
			localStorage.setItem(STORAGE_KEY, value);
			apply(value);
		}
	},
};
