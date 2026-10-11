// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { navigationData } from '../data/navigation';
import { useNavigationStore } from './navigationStore';

const submenu = navigationData.mainMenu.find(item => item.type === 'submenu' && item.submenu?.length);
const subpage = submenu.submenu.find(item => item.type === 'page');
const nested = submenu.submenu.find(item => item.type === 'submenu' && item.submenu?.length);
const nestedPage = nested?.submenu[0];
const topPage = navigationData.mainMenu.find(item => item.type === 'page');

const store = () => useNavigationStore.getState();
const path = () => window.location.pathname;

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  store().navigateToHome();
});

describe('navigation actions', () => {
  it('opens a submenu landing page and pushes its URL', () => {
    store().navigateToSubmenu(submenu.id);
    expect(store()).toMatchObject({ currentView: submenu.id, expandedSubmenuId: submenu.id });
    expect(path()).toBe(`/${submenu.id}`);
  });

  it('collapses the submenu when its parent is clicked again on the landing page', () => {
    store().navigateToSubmenu(submenu.id);
    store().navigateToSubmenu(submenu.id);
    expect(store()).toMatchObject({ currentView: null, expandedSubmenuId: null, currentMenu: 'main' });
  });

  it('returns to the submenu landing when its parent is clicked from a subpage', () => {
    store().navigateToSubmenu(submenu.id);
    store().navigateToSubpage(subpage.id, submenu.id);
    store().navigateToSubmenu(submenu.id);
    expect(store()).toMatchObject({ currentView: submenu.id, expandedSubmenuId: submenu.id });
  });

  it('navigates to a top-level page', () => {
    store().navigateToPage(topPage.id, topPage.id);
    expect(store().currentView).toBe(topPage.id);
    expect(path()).toBe(`/${topPage.id}`);
  });
});

describe('goBack', () => {
  it('subpage → submenu landing (collapsed) → home', () => {
    store().navigateToSubmenu(submenu.id);
    store().navigateToSubpage(subpage.id, submenu.id);
    expect(path()).toBe(`/${submenu.id}/${subpage.id}`);

    store().goBack();
    expect(store()).toMatchObject({ currentView: submenu.id, expandedSubmenuId: null, currentMenu: 'main' });

    // With the submenu collapsed, the landing page counts as a main-menu page
    store().goBack();
    expect(store().currentView).toBe('home');
    expect(path()).toBe('/');
  });

  it('submenu landing → home', () => {
    store().navigateToSubmenu(submenu.id);
    store().goBack();
    expect(store()).toMatchObject({ currentView: 'home', expandedSubmenuId: null });
  });

  it.runIf(nestedPage)('nested page → nested grid → submenu landing', () => {
    store().navigateToSubmenu(submenu.id);
    store().navigateToNestedSubmenu(nested.id);
    store().navigateToSubpage(nestedPage.id, submenu.id, nested.id);
    expect(path()).toBe(`/${submenu.id}/${nested.id}/${nestedPage.id}`);

    store().goBack();
    expect(store()).toMatchObject({ currentView: nested.id, expandedNestedSubmenuId: nested.id, parentView: null });

    store().goBack();
    expect(store()).toMatchObject({ currentView: submenu.id, expandedSubmenuId: submenu.id, expandedNestedSubmenuId: null });
  });

  it('does nothing at home', () => {
    const before = store();
    store().goBack();
    expect(store().currentView).toBe(before.currentView);
    expect(path()).toBe('/');
  });

  it('canGoBack reflects whether there is anywhere to go', () => {
    expect(store().canGoBack()).toBe(false);
    store().navigateToSubmenu(submenu.id);
    expect(store().canGoBack()).toBe(true);
  });
});

describe('URL sync', () => {
  it('initFromUrl resolves a deep link and skips the landing overlay', () => {
    window.history.replaceState(null, '', `/${submenu.id}/${subpage.id}/`);
    useNavigationStore.setState({ isLandingDismissed: false });

    expect(store().initFromUrl()).toBe(true);
    expect(store()).toMatchObject({ currentView: subpage.id, expandedSubmenuId: submenu.id, isLandingDismissed: true });
    expect(path()).toBe(`/${submenu.id}/${subpage.id}`); // normalised via replaceState
  });

  it('initFromUrl leaves state alone for /', () => {
    expect(store().initFromUrl()).toBe(false);
    expect(store().currentView).toBe('home');
  });

  it('back/forward (popstate) updates state without pushing a new entry', () => {
    const cleanup = store().setupPopstateListener();
    try {
      window.history.pushState(null, '', `/${topPage.id}`);
      const lengthBefore = window.history.length;
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(store().currentView).toBe(topPage.id);
      expect(window.history.length).toBe(lengthBefore);
    } finally {
      cleanup();
    }
  });
});
