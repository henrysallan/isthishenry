// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const root = document.documentElement;
const realMatchMedia = window.matchMedia;
let cleanup = null;

// The system setting, as a media query the test can flip
function setSystem(dark) {
  const listeners = new Set();
  const query = {
    matches: dark,
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  };
  window.matchMedia = () => query;
  return (nowDark) => {
    query.matches = nowDark;
    listeners.forEach(fn => fn());
  };
}

// A fresh copy of the store, as on page load
async function load() {
  vi.resetModules();
  const module = await import('./themeStore');
  cleanup = module.initTheme();
  return module.useThemeStore;
}

beforeEach(() => {
  localStorage.clear();
  delete root.dataset.theme;
});

afterEach(() => {
  cleanup?.();
  cleanup = null;
  window.matchMedia = realMatchMedia;
});

describe('theme store', () => {
  it('follows the system setting when nothing has been picked', async () => {
    setSystem(true);
    const store = await load();
    expect(store.getState().theme).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
  });

  it('starts with a saved pick over the system setting', async () => {
    setSystem(true);
    localStorage.setItem('theme', 'light');
    const store = await load();
    expect(store.getState().theme).toBe('light');
    expect(root.dataset.theme).toBe('light');
  });

  it('ignores a saved value that is not a theme', async () => {
    setSystem(false);
    localStorage.setItem('theme', 'sepia');
    const store = await load();
    expect(store.getState().theme).toBe('light');
  });

  it('saves a pick that differs from the system, and forgets one that matches it', async () => {
    setSystem(false);
    const store = await load();
    store.getState().toggleTheme();
    expect(store.getState().theme).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');

    store.getState().toggleTheme();
    expect(store.getState().theme).toBe('light');
    expect(root.dataset.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('follows system changes only while nothing is picked', async () => {
    const changeSystem = setSystem(false);
    const store = await load();
    changeSystem(true);
    expect(store.getState().theme).toBe('dark');
    expect(root.dataset.theme).toBe('dark');

    store.getState().setTheme('light');
    changeSystem(false);
    changeSystem(true);
    expect(store.getState().theme).toBe('light');
    expect(root.dataset.theme).toBe('light');
  });

  it('takes up a pick made in another tab', async () => {
    setSystem(false);
    const store = await load();
    localStorage.setItem('theme', 'dark');
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme' }));
    expect(store.getState().theme).toBe('dark');
    expect(root.dataset.theme).toBe('dark');

    localStorage.removeItem('theme');
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme' }));
    expect(store.getState().theme).toBe('light');
  });

  it('holds transitions off only for the switch', async () => {
    vi.useFakeTimers();
    try {
      setSystem(false);
      const store = await load();
      store.getState().toggleTheme();
      expect(root.classList.contains('theme-switching')).toBe(true);
      vi.runAllTimers();
      expect(root.classList.contains('theme-switching')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
