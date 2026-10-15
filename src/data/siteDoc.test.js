import { describe, it, expect } from 'vitest';
import { navigationData as snapshot } from './navigation';
import { blocksToRows, pageBlocks, toSiteDoc, validateDoc, walkItems } from './siteDoc';

const spans = (rows) => rows.map((row) => row.blocks.map((b) => `${b.colStart}+${b.colSpan}`).join(' '));

describe('blocksToRows', () => {
  it('breaks rows where CSS grid auto-placement did', () => {
    const rows = blocksToRows([
      { colStart: 1, colSpan: 12 },
      { colStart: 1, colSpan: 6 },
      { colStart: 7, colSpan: 6 },
      { colStart: 5, colSpan: 4 },
      { colStart: 9, colSpan: 4 },
    ]);
    expect(spans(rows)).toEqual(['1+12', '1+6 7+6', '5+4 9+4']);
  });

  it('resolves relative sources against the page baseUrl', () => {
    const [row] = blocksToRows([{ type: 'image', src: 'a.gif', colStart: 1, colSpan: 12 }], 'https://cdn.example/x/');
    expect(row.blocks[0].src).toBe('https://cdn.example/x/a.gif');
  });
});

describe('toSiteDoc', () => {
  const doc = toSiteDoc(snapshot);

  it('converts the navigation.js snapshot into a valid document', () => {
    expect(validateDoc(doc)).toEqual([]);
  });

  it('keeps every block, in order', () => {
    walkItems(snapshot.mainMenu, (item) => {
      if (!item.content?.blocks) return;
      let converted = null;
      walkItems(doc.mainMenu, (other) => { if (other.id === item.id) converted = other; });
      const srcs = pageBlocks(converted.content).map((b) => b.src || b.content);
      expect(srcs.length).toBe(item.content.blocks.length);
      expect(srcs.at(-1)).toContain((item.content.blocks.at(-1).src || item.content.blocks.at(-1).content));
    });
  });

  it('leaves its input alone and is idempotent', () => {
    expect(snapshot.mainMenu[0].submenu[0].content.blocks).toBeDefined();
    expect(toSiteDoc(doc)).toEqual(doc);
  });
});

describe('validateDoc', () => {
  it('catches overlapping blocks and repeated ids', () => {
    const page = (id, blocks) => ({ id, type: 'page', content: { rows: [{ id: 'r', blocks }] } });
    const doc = {
      version: 2,
      home: { content: {} },
      mainMenu: [page('a', [{ id: 'x', colStart: 1, colSpan: 7 }, { id: 'y', colStart: 7, colSpan: 6 }]), page('a', [])],
    };
    const errors = validateDoc(doc);
    expect(errors.some((e) => e.includes('overlap'))).toBe(true);
    expect(errors.some((e) => e.includes('Two pages'))).toBe(true);
  });
});
