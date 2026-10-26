import { create } from 'zustand';

// Light or dark. The site follows the system setting until the toggle picks a
// theme, which is remembered; picking the system's own theme goes back to
// following it. index.html applies the same choice before the first paint, as
// data-theme on <html>; the colors themselves are CSS variables in index.css.

// index.html reads this key too
const STORAGE_KEY = 'theme';
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

const systemTheme = () => (systemDark.matches ? 'dark' : 'light');

function readPick() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    // Storage is blocked
    return null;
  }
}

// The visitor's pick, or null while following the system. Kept here as well as
// in storage so a pick still holds for the visit when storage is blocked.
let pick = readPick();

function savePick(theme) {
  pick = theme === systemTheme() ? null : theme;
  try {
    if (pick) localStorage.setItem(STORAGE_KEY, pick);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage is blocked; the pick lasts for this visit
  }
}

// Phones' browser bars and Safari's tab bar take the page background
function updateThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  const background = getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim();
  if (meta && background) meta.content = background;
}

let switchingTimer = null;

// Every color changes at once: index.css holds transitions off while
// .theme-switching is set, so hover fades and the like don't trail behind
function applyTheme(theme) {
  const root = document.documentElement;
  clearTimeout(switchingTimer);
  root.classList.add('theme-switching');
  root.dataset.theme = theme;
  // Work out the new colors while transitions are still off
  void getComputedStyle(document.body).color;
  switchingTimer = setTimeout(() => root.classList.remove('theme-switching'), 1);
  updateThemeColor();
}

export const useThemeStore = create((set, get) => ({
  theme: pick ?? systemTheme(),

  // The visitor's choice
  setTheme: (theme) => {
    savePick(theme);
    applyTheme(theme);
    set({ theme });
  },

  // Flips whatever is showing when it runs, so quick repeat presses alternate
  // even while an earlier switch is still waiting to happen
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}));

// A change the visitor didn't make here: the system setting, or a pick in another tab
function follow(theme) {
  if (useThemeStore.getState().theme === theme) return;
  applyTheme(theme);
  useThemeStore.setState({ theme });
}

// main.jsx calls this once for the site; the editor at /crm stays light. Makes
// sure the page shows the store's theme (index.html has normally set it), then
// keeps up with the system setting and picks made in other tabs. Returns a
// cleanup function.
export function initTheme() {
  const { theme } = useThemeStore.getState();
  if (document.documentElement.dataset.theme !== theme) applyTheme(theme);
  else updateThemeColor();

  const onSystemChange = () => {
    if (!pick) follow(systemTheme());
  };
  const onStorage = (e) => {
    // A null key means storage was cleared
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    pick = readPick();
    follow(pick ?? systemTheme());
  };
  systemDark.addEventListener('change', onSystemChange);
  window.addEventListener('storage', onStorage);
  return () => {
    systemDark.removeEventListener('change', onSystemChange);
    window.removeEventListener('storage', onStorage);
  };
}
