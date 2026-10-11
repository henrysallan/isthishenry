import { describe, it, expect } from 'vitest';
import { navigationData } from '../data/navigation';
import { resolveUrlToState, stateToUrl } from './urlSync';

// Pull representative routes from the live data so the tests survive content edits.
const submenu = navigationData.mainMenu.find(item => item.type === 'submenu' && item.submenu?.length);
const subpage = submenu.submenu.find(item => item.type === 'page');
const nested = submenu.submenu.find(item => item.type === 'submenu' && item.submenu?.length);
const nestedPage = nested?.submenu[0];
const topPage = navigationData.mainMenu.find(item => item.type === 'page');

function allIds() {
  const ids = [];
  const walk = (items) => items.forEach(item => {
    ids.push(item.id);
    if (item.submenu) walk(item.submenu);
  });
  walk(navigationData.mainMenu);
  return ids;
}

describe('resolveUrlToState', () => {
  it('treats / and unknown paths as home (null)', () => {
    expect(resolveUrlToState('/')).toBeNull();
    expect(resolveUrlToState('/definitely-not-a-page')).toBeNull();
  });

  it('resolves a top-level page', () => {
    expect(resolveUrlToState(`/${topPage.id}`)).toEqual({
      currentView: topPage.id,
      currentMenu: 'main',
      activeMenuItem: topPage.id,
      expandedSubmenuId: null,
      expandedNestedSubmenuId: null,
      parentView: null
    });
  });

  it('resolves a submenu landing page', () => {
    expect(resolveUrlToState(`/${submenu.id}`)).toMatchObject({
      currentView: submenu.id,
      currentMenu: submenu.id,
      expandedSubmenuId: submenu.id,
      expandedNestedSubmenuId: null
    });
  });

  it('resolves a subpage inside a submenu', () => {
    expect(resolveUrlToState(`/${submenu.id}/${subpage.id}`)).toMatchObject({
      currentView: subpage.id,
      activeMenuItem: subpage.id,
      expandedSubmenuId: submenu.id,
      parentView: null
    });
  });

  it.runIf(nestedPage)('resolves nested submenus and their pages', () => {
    expect(resolveUrlToState(`/${submenu.id}/${nested.id}`)).toMatchObject({
      currentView: nested.id,
      expandedSubmenuId: submenu.id,
      expandedNestedSubmenuId: nested.id,
      parentView: null
    });
    expect(resolveUrlToState(`/${submenu.id}/${nested.id}/${nestedPage.id}`)).toMatchObject({
      currentView: nestedPage.id,
      activeMenuItem: nested.id,
      expandedSubmenuId: submenu.id,
      expandedNestedSubmenuId: nested.id,
      parentView: nested.id
    });
  });

  it('ignores trailing slashes', () => {
    expect(resolveUrlToState(`/${submenu.id}/`)).toEqual(resolveUrlToState(`/${submenu.id}`));
  });
});

describe('stateToUrl', () => {
  it('maps home and unknown ids to /', () => {
    expect(stateToUrl('home')).toBe('/');
    expect(stateToUrl(null)).toBe('/');
    expect(stateToUrl('definitely-not-a-page')).toBe('/');
  });

  it('round-trips every page id in the navigation data', () => {
    for (const id of allIds()) {
      const url = stateToUrl(id);
      expect(url, id).not.toBe('/');
      expect(resolveUrlToState(url)?.currentView, url).toBe(id);
    }
  });

  it('has no duplicate ids (they would collide in the route table)', () => {
    const ids = allIds();
    expect(new Set(ids).size).toBe(ids.length);
  });
});
