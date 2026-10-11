import { describe, it, expect } from 'vitest';
import { navigationData } from '../data/navigation';
import { siteIndex } from './siteIndex';
import { fuzzySearch } from './fuzzySearch';
import { stateToUrl } from './urlSync';

describe('siteIndex', () => {
  it('lists every visible page once, each with a URL', () => {
    const ids = siteIndex.map(entry => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(stateToUrl(id)).not.toBe('/');
    const hidden = navigationData.mainMenu.filter(item => item.hidden).map(item => item.id);
    for (const id of hidden) expect(ids).not.toContain(id);
  });

  it('records the menus above nested pages', () => {
    const nested = navigationData.mainMenu.find(item => item.submenu?.some(child => child.submenu));
    const nestedMenu = nested.submenu.find(child => child.submenu);
    const page = siteIndex.find(entry => entry.id === nestedMenu.submenu[0].id);
    expect(page.section).toBe(`${nested.title} / ${nestedMenu.title}`);
  });

  it('finds pages by fuzzy title, tags and description', () => {
    const titles = (query) => fuzzySearch(siteIndex, query).map(entry => entry.title);
    expect(titles('kls')[0]).toBe('Kalshi');
    expect(titles('poetry')[0]).toBe('Poetry Map');
    expect(titles('nyc')).toContain('About');
    expect(titles('poetyr')[0]).toBe('Poetry Map');
  });
});
