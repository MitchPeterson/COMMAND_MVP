// A preview of the light direction.
//
// The palette lives in eight CSS variables, so switching is a class on <html>
// rather than a change to any component. That is the whole point of the
// variable refactor: this file is nine lines because the tokens do the work.
//
// It is a preview, not a setting. The dark theme is still what Command is
// designed against, and plenty of screens have not been reviewed against a
// light ground — the toggle exists so the two can be compared before anyone
// commits to converting them.

const KEY = 'command:theme-preview';

export type ThemeName = 'dark' | 'light';

export function readTheme(): ThemeName {
  return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.classList.toggle('theme-light', theme === 'light');
  localStorage.setItem(KEY, theme);
}
