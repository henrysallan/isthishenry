import { flushSync } from 'react-dom';
import { useThemeStore } from '../store/themeStore';
import './ThemeToggle.css';

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M13.5 9.3 A5.8 5.8 0 1 1 6.7 2.5 A4.5 4.5 0 0 0 13.5 9.3 Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="2.75" />
      <path d="M8 1.5 V2.25 M8 13.75 V14.5 M1.5 8 H2.25 M13.75 8 H14.5 M3.4 3.4 L3.95 3.95 M12.05 12.05 L12.6 12.6 M3.4 12.6 L3.95 12.05 M12.05 3.95 L12.6 3.4" />
    </svg>
  );
}

// Cross-fades the whole page into the new theme where the browser can (and
// motion is welcome); otherwise it switches at once. flushSync gets React's
// part of the change onto the page before the new state is captured.
function crossFade(update) {
  if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update();
    return;
  }
  document.startViewTransition(() => flushSync(update));
}

// Light/dark switch at the right of the site search bar. Shows the theme it
// switches to: a moon while light, a sun while dark.
function ThemeToggle() {
  const isDark = useThemeStore(state => state.theme === 'dark');
  const toggleTheme = useThemeStore(state => state.toggleTheme);

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Dark mode"
      aria-pressed={isDark}
      onClick={() => crossFade(toggleTheme)}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export default ThemeToggle;
